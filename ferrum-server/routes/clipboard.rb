# frozen_string_literal: true

post '/sessions/copy' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::CopyCut, action_type: 'copy')

  options = body.slice(:timeout, :interval)

  result = session.copy(
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    selection_start: body[:selectionStart],
    selection_end: body[:selectionEnd],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'copy',
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end

post '/sessions/cut' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::CopyCut, action_type: 'cut')

  options = body.slice(:timeout, :interval)

  result = session.cut(
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    selection_start: body[:selectionStart],
    selection_end: body[:selectionEnd],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'cut',
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end
