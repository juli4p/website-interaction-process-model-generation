# frozen_string_literal: true

post '/sessions/type_text' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::TypeText, action_type: 'type_text')

  strategy = body.fetch(:strategy, 'selector')

  options = body.slice(:timeout, :interval)

  result = session.type_text(
    strategy: strategy,
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    text: body[:text],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'type_text',
    strategy: strategy,
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end

post '/sessions/press_special_key' do
  content_type :json

  session, step_id, body = prepare_session_action!(Contracts::PressKey, action_type: 'press_special_key')

  options = body.slice(:shift, :ctrl, :alt, :meta)
  session.press_special_key(body[:key], **options)

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'press_special_key',
    key: body[:key],
    shift: body.fetch(:shift, false),
    ctrl: body.fetch(:ctrl, false),
    alt: body.fetch(:alt, false),
    meta: body.fetch(:meta, false)
  )
end
