# frozen_string_literal: true

require 'json'
require_relative 'contracts'

module ValidationHelper
  def validate_body!(contract_class)
    body = parse_body
    env['session_id'] = body['id'] || body[:id]
    body = normalize_json_array(body, 'selectorSegments')
    body = normalize_json_array(body, 'selectorIndexes')
    body = normalize_json_array(body, 'windowSize')

    # Validate the request body and return only the fields defined by the contract
    result = contract_class.new.call(body)

    unless result.success?
      LOGGER.warn('api', action: 'validation_failed', path: request.path, errors: result.errors.to_h)
      halt 400, api_response(
        session_id: env['session_id'],
        status: 'failed',
        action_type: env['action_type'],
        error: 'Validation failed',
        details: result.errors.to_h
      )
    end

    result.to_h
  end

  def parse_body
    case request.media_type
    when 'application/json'
      raw_body = request.body.read
      raw_body.empty? ? {} : JSON.parse(raw_body)

    when 'application/x-www-form-urlencoded'
      # remove sinatra's internal params keys that are not part of the request body
      params.reject { |k, _| %w[splat captures].include?(k) }

    else
      LOGGER.warn('api', action: 'unsupported_content_type', path: request.path, content_type: request.media_type)
      halt 415, api_response(
        session_id: env['session_id'],
        status: 'failed',
        action_type: env['action_type'],
        error: 'Unsupported Content-Type'
      )
    end
  rescue JSON::ParserError => e
    LOGGER.warn('api', action: 'json_parse_failed', path: request.path, error: e.message)
    halt 400, api_response(
      session_id: env['session_id'],
      status: 'failed',
      action_type: env['action_type'],
      error: 'Invalid JSON'
    )
  end

  # Normalize the JSON array fields (f.e. selectorSegments)
  # because x-www-form-urlencoded requests send them as a JSON strings
  def normalize_json_array(body, field_name)
    symbol_name = field_name.to_sym
    value = body[field_name] || body[symbol_name]

    return body if value.nil? || value.is_a?(Array)

    parsed = JSON.parse(value)

    unless parsed.is_a?(Array)
      halt 400, api_response(
        session_id: env['session_id'],
        status: 'failed',
        action_type: env['action_type'],
        error: "#{field_name} must be a valid JSON array"
      )
    end

    body.merge(field_name => parsed)
  rescue JSON::ParserError => e
    LOGGER.warn(
      'api',
      action: 'json_array_parse_failed',
      field: field_name,
      path: request.path,
      error: e.message
    )

    halt 400, api_response(
      session_id: env['session_id'],
      status: 'failed',
      action_type: env['action_type'],
      error: "#{field_name} must be a valid JSON array"
    )
  end
end
