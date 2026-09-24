# frozen_string_literal: true

module RouteHelper
  def prepare_session_action!(contract_class, action_type:)
    env['action_type'] = action_type

    body = validate_body!(contract_class)
    session_id = body.fetch(:id)

    env['session_id'] = session_id

    session = get_session!(session_id)

    step_id = session.next_step_id
    env['step_id'] = step_id

    halt_if_skipped!(session, step_id, body, action_type)

    [session, step_id, body]
  end

  def get_session!(session_id)
    session = STORE.fetch(session_id)

    unless session
      log(:warn, 'session_not_found')

      halt 404, api_response(
        session_id: session_id,
        step_id: env['step_id'],
        status: 'failed',
        action_type: env['action_type'],
        error: 'Session not found'
      )
    end

    session
  end

  def halt_if_skipped!(session, step_id, body, action_type)
    return unless body[:skip] == true

    log(:info, 'step_skipped')

    halt 200, api_response(
      session_id: session.id,
      step_id: step_id,
      status: 'skipped',
      action_type: action_type
    )
  end

  def action_response(session:, step_id:, action_type:, status: 'success', **fields)
    {
      sessionId: session.id,
      stepId: step_id,
      status: status,
      actionType: action_type,
      **fields

    }.compact.to_json
  end

  def api_response(status:, session_id: nil, step_id: nil, action_type: nil, **fields)
    {
      sessionId: session_id,
      stepId: step_id,
      status: status,
      actionType: action_type,
      **fields
    }.compact.to_json
  end
end
