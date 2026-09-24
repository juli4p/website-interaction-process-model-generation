# frozen_string_literal: true

require 'logger'
require 'fileutils'

# A simple logger that writes structured log messages to a file, with support for different log levels and categories.
class AppLogger
  LEVELS = %i[debug info warn error fatal].freeze

  def initialize(path:, level: Logger::INFO)
    FileUtils.mkdir_p(File.dirname(path))

    @logger = Logger.new(path, 'weekly')
    @logger.level = level
  end

  def log(level, category, **fields)
    level = level.to_sym

    raise ArgumentError, "Invalid log level: #{level.inspect}" unless LEVELS.include?(level)

    @logger.public_send(
      level,
      { category: category }.merge(fields)
                            .compact
                            .map { |k, v| "#{k}=#{v.inspect}" }
                            .join(' | ')
    )
  end

  def debug(category, **fields) = log(:debug, category, **fields)
  def info(category, **fields) = log(:info, category, **fields)
  def warn(category, **fields) = log(:warn, category, **fields)
  def error(category, **fields) = log(:error, category, **fields)
  def fatal(category, **fields) = log(:fatal, category, **fields)
end
