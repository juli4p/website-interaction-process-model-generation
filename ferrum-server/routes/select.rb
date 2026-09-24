# frozen_string_literal: true

post '/sessions/select' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::Select, action_type: 'select')

  options = body.slice(
    :timeout,
    :interval
  )

  result = session.select_option(
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    selected_index: body[:selectedIndex],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'select',
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end
