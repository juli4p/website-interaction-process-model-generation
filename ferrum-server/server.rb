# frozen_string_literal: true

require 'sinatra'
require 'json'

require_relative 'lib/server/app_logger'
require_relative 'lib/server/session_store'
require_relative 'lib/server/validation/contracts'
require_relative 'lib/server/validation/helper'
require_relative 'lib/server/route_helper'

require_relative 'lib/ferrum/errors'

set :bind, '0.0.0.0'
set :port, 4567
set :show_exceptions, false
set :public_folder, File.expand_path('public', __dir__)
set :static, true
# Disable Sinatra's implicit auto-run behavior.
# We start the server manually at the bottom of the file
# so our custom at_exit shutdown only runs on real shutdown.
set :run, false
set :host_authorization, {
  permitted_hosts: [
    'localhost',
    '127.0.0.1',
    'lehre.bpm.in.tum.de'
  ]
}
PUBLIC_BASE_URL = 'https://lehre.bpm.in.tum.de/ports/4567'

LOGGER = AppLogger.new(
  path: 'logs/ferrum_server.log',
  level: Logger::DEBUG
)
STORE = SessionStore.new(server_logger: LOGGER)

helpers ValidationHelper
helpers RouteHelper
helpers do
  def log(level, action, error: nil, **fields)
    return unless LOGGER

    payload = {
      action: action,
      session_id: env['session_id'],
      step_id: env['step_id'],
      **fields
    }

    if error
      payload[:error_class] = error.class.name
      payload[:error_message] = error.message
    end

    LOGGER.log(level, 'api', **payload)
  end
end

LOGGER.info('server', action: 'start', bind: settings.bind, port: settings.port)

at_exit do
  LOGGER.info('server', action: 'shutdown_start')
  STORE.close_all
  LOGGER.info('server', action: 'shutdown_complete')
end

before do
  env['request_started_at'] = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  log(:debug, 'request_start', method: request.request_method, path: request.path, Host: request.host)
end

after do
  started_at = env['request_started_at']
  duration_ms =
    (((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000).round(1) if started_at)

  log(:debug, 'request_finish', method: request.request_method, path: request.path, status: response.status,
                                duration_ms: duration_ms)
end

error Ferrum::ElementNotFoundError do
  content_type :json
  status 404
  error = env['sinatra.error']
  log(
    :warn,
    'element_not_found',
    method: request.request_method,
    path: request.path,
    error: error
  )
  api_response(
    session_id: env['session_id'],
    step_id: env['step_id'],
    status: 'failed',
    action_type: env['action_type'],
    error: 'Element not found',
    message: error.message
  )
end

error do
  content_type :json

  e = env['sinatra.error']

  log(
    :error,
    'unhandled_error',
    method: request.request_method,
    path: request.path,
    error: e
  )

  status 500

  api_response(
    session_id: env['session_id'],
    step_id: env['step_id'],
    status: 'failed',
    action_type: env['action_type'],
    error: 'Internal server error'
  )
end

not_found do
  # skip global handler if a route already generated a response (e.g. 404 "Session not found")
  pass if response.body&.any?
  log(:warn, 'route_not_found', method: request.request_method, path: request.path)
  content_type :json
  status 404
  api_response(
    session_id: env['session_id'],
    step_id: env['step_id'],
    status: 'failed',
    action_type: env['action_type'],
    error: 'Route not found',
    method: request.request_method,
    path: request.path
  )
end

require_relative 'routes/sessions'
require_relative 'routes/navigation'
require_relative 'routes/keyboard'
require_relative 'routes/mouse'
require_relative 'routes/select'
require_relative 'routes/clipboard'
require_relative 'routes/debug'
require_relative 'routes/screenshot'
require_relative 'routes/element'

Sinatra::Application.run! if __FILE__ == $PROGRAM_NAME
