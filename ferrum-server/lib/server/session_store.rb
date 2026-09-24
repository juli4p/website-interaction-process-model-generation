# frozen_string_literal: true

require_relative '../ferrum/session'

# Manages Ferrum sessions, providing methods to create, fetch, and delete sessions.
class SessionStore
  def initialize(server_logger: nil)
    @server_logger = server_logger
    @sessions = {}
    @next_id = 1
    @mutex = Mutex.new
  end

  def create(headless: true, window_size: [1440, 1000], timeout: 10)
    @mutex.synchronize do
      # random ids as alternative to sequential ids
      # id = SecureRandom.uuid + require 'securerandom'
      id = @next_id.to_s
      @next_id += 1

      session = FerrumSession.new(
        id: id,
        headless: headless,
        window_size: window_size,
        timeout: timeout,
        server_logger: @server_logger
      )

      @sessions[id] = session
      session
    end
  end

  def fetch(id)
    @mutex.synchronize do
      @sessions[id]
    end
  end

  def delete(id)
    session = @mutex.synchronize do
      @sessions.delete(id)
    end

    session&.close
    session
  end

  def close_all
    sessions = @mutex.synchronize do
      current_sessions = @sessions.values
      @sessions.clear
      current_sessions
    end

    sessions.each(&:close)
  end
end
