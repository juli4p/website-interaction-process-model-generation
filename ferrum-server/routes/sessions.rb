# frozen_string_literal: true

post '/sessions' do
  content_type :json

  env['action_type'] = 'create_session'
  body = validate_body!(Contracts::CreateSession)

  options = {
    headless: body.fetch(:headless, true),
    window_size: body.fetch(:windowSize, [1440, 1000]),
    timeout: body.fetch(:timeout, 10)
  }

  log(
    :info,
    'create_session',
    headless: options[:headless],
    window_size: options[:window_size],
    timeout: options[:timeout]
  )

  session = STORE.create(**options)

  api_response(
    session_id: session.id,
    status: 'created',
    action_type: 'create_session',
    headless: options[:headless],
    windowSize: options[:window_size],
    timeout: options[:timeout]
  )
end

delete '/sessions' do
  content_type :json

  env['action_type'] = 'delete_session'
  body = validate_body!(Contracts::DeleteSession)
  session_id = body[:id]
  env['session_id'] = session_id
  session = STORE.delete(session_id)

  unless session
    log(:warn, 'delete_session_not_found', sessionId: session_id)

    halt 404, api_response(
      session_id: session_id,
      status: 'failed',
      action_type: 'delete_session',
      error: 'Session not found'
    )
  end

  log(:info, 'delete_session', sessionId: session_id)
  api_response(
    session_id: session.id,
    status: 'closed',
    action_type: 'delete_session'
  )
end
