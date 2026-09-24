# frozen_string_literal: true

require 'dry/validation'

module Contracts
  class CreateSession < Dry::Validation::Contract
    params do
      optional(:headless).filled(:bool)
      optional(:windowSize).array(:integer)
      optional(:timeout).filled(:float)
    end

    rule(:windowSize) do
      next unless value

      if value.length != 2
        key.failure('must contain exactly two values: width and height')
      elsif value.any? { |dimension| dimension <= 0 }
        key.failure('must contain only values greater than 0')
      end
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end
  end

  class DeleteSession < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
    end
  end

  class Navigate < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:url).filled(:string)
      optional(:skip).filled(:bool)
    end
  end

  class TypeText < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:text).filled(:string)

      optional(:strategy).filled(:string)

      optional(:selectorType).filled(:string)
      optional(:selectorSegments).array(:string)
      optional(:selectorIndexes).array(:integer)

      optional(:skip).filled(:bool)
      optional(:timeout).filled(:float)
      optional(:interval).filled(:float)
    end

    rule(:strategy) do
      allowed = %w[selector focused]

      if value && !allowed.include?(value)
        key.failure(
          "must be one of: #{allowed.join(', ')}"
        )
      end
    end

    rule(:strategy, :selectorType, :selectorSegments, :selectorIndexes) do
      strategy = values[:strategy] || 'selector'

      next unless strategy == 'selector'

      if values[:selectorType].nil?
        key(:selectorType).failure(
          'is required for selector strategy'
        )
      end

      if values[:selectorSegments].nil?
        key(:selectorSegments).failure(
          'is required for selector strategy'
        )
      end

      if values[:selectorIndexes].nil?
        key(:selectorIndexes).failure(
          'is required for selector strategy'
        )
      end
    end

    rule(:strategy, :selectorType) do
      next if values[:strategy] == 'focused'

      type = values[:selectorType]
      next unless type

      allowed = %w[css shadow_css]

      unless allowed.include?(type)
        key(:selectorType).failure(
          "must be one of: #{allowed.join(', ')}"
        )
      end
    end

    rule(:strategy, :selectorSegments) do
      next if values[:strategy] == 'focused'

      segments = values[:selectorSegments]
      next unless segments

      if segments.any? { |segment| segment.strip.empty? }
        key(:selectorSegments).failure(
          'must contain only non-empty selectors'
        )
      end
    end

    rule(:strategy, :selectorType, :selectorSegments) do
      next if values[:strategy] == 'focused'

      type = values[:selectorType]
      segments = values[:selectorSegments]

      next unless type && segments

      if type == 'css' && segments.length != 1
        key(:selectorSegments).failure(
          'must contain exactly one selector for selectorType css'
        )
      end

      if type == 'shadow_css' && segments.length < 2
        key(:selectorSegments).failure(
          'must contain at least two selectors for selectorType shadow_css'
        )
      end
    end

    rule(:strategy, :selectorIndexes) do
      next if values[:strategy] == 'focused'

      indexes = values[:selectorIndexes]
      next unless indexes

      if indexes.any?(&:negative?)
        key(:selectorIndexes).failure(
          'must contain only integers greater than or equal to 0'
        )
      end
    end

    rule(:strategy, :selectorSegments, :selectorIndexes) do
      next if values[:strategy] == 'focused'

      segments = values[:selectorSegments]
      indexes = values[:selectorIndexes]

      next unless segments && indexes

      if segments.length != indexes.length
        key(:selectorIndexes).failure(
          'must contain exactly one index for each selector segment'
        )
      end
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:interval) do
      key.failure('must be greater than 0') if value && value <= 0
    end
  end

  class PressKey < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:key).filled(:string)

      optional(:skip).filled(:bool)
      optional(:shift).filled(:bool)
      optional(:ctrl).filled(:bool)
      optional(:alt).filled(:bool)
      optional(:meta).filled(:bool)
    end

    rule(:key) do
      allowed = %w[
        Enter
        Escape
        Tab
        Backspace
        Delete
        ArrowUp
        ArrowDown
        ArrowLeft
        ArrowRight
        Home
        End
        PageUp
        PageDown
      ]

      unless allowed.include?(value)
        key.failure(
          "must be one of: #{allowed.join(', ')}"
        )
      end
    end
  end

  class Click < Dry::Validation::Contract
    params do
      required(:id).filled(:string)

      optional(:selectorType).filled(:string)
      optional(:selectorSegments).array(:string)
      optional(:selectorIndexes).array(:integer)

      optional(:strategy).filled(:string)
      optional(:skip).filled(:bool)
      optional(:timeout).filled(:float)
      optional(:interval).filled(:float)

      optional(:rx).filled(:float)
      optional(:ry).filled(:float)
      optional(:debug_marker).filled(:bool)

      optional(:shift).filled(:bool)
      optional(:ctrl).filled(:bool)
      optional(:alt).filled(:bool)
      optional(:meta).filled(:bool)
    end

    rule(:strategy) do
      allowed = %w[css xy css_fallback_xy]

      if value && !allowed.include?(value)
        key.failure(
          "must be one of: #{allowed.join(', ')}"
        )
      end
    end

    rule(
      :strategy,
      :selectorType,
      :selectorSegments,
      :selectorIndexes
    ) do
      strategy = values[:strategy] || 'css'

      selector_present =
        !values[:selectorType].nil? ||
        !values[:selectorSegments].nil? ||
        !values[:selectorIndexes].nil?

      selector_required =
        %w[css css_fallback_xy].include?(strategy)

      # css and css_fallback_xy always require a selector.
      if selector_required
        if values[:selectorType].nil?
          key(:selectorType).failure(
            "is required for #{strategy} strategy"
          )
        end

        if values[:selectorSegments].nil?
          key(:selectorSegments).failure(
            "is required for #{strategy} strategy"
          )
        end

        if values[:selectorIndexes].nil?
          key(:selectorIndexes).failure(
            "is required for #{strategy} strategy"
          )
        end
      end

      # For xy, either provide the complete selector or no selector at all.
      if strategy == 'xy' && selector_present
        if values[:selectorType].nil?
          key(:selectorType).failure(
            'is required when a selector is provided'
          )
        end

        if values[:selectorSegments].nil?
          key(:selectorSegments).failure(
            'is required when a selector is provided'
          )
        end

        if values[:selectorIndexes].nil?
          key(:selectorIndexes).failure(
            'is required when a selector is provided'
          )
        end
      end
    end

    rule(:selectorType) do
      type = value
      next unless type

      allowed = %w[css shadow_css]

      unless allowed.include?(type)
        key.failure(
          "must be one of: #{allowed.join(', ')}"
        )
      end
    end

    rule(:selectorSegments) do
      segments = value
      next unless segments

      if segments.empty?
        key.failure(
          'must contain at least one selector'
        )
      end

      if segments.any? { |segment| segment.strip.empty? }
        key.failure(
          'must contain only non-empty selectors'
        )
      end
    end

    rule(:selectorType, :selectorSegments) do
      type = values[:selectorType]
      segments = values[:selectorSegments]

      next unless type && segments

      if type == 'css' && segments.length != 1
        key(:selectorSegments).failure(
          'must contain exactly one selector for selectorType css'
        )
      end

      if type == 'shadow_css' && segments.length < 2
        key(:selectorSegments).failure(
          'must contain at least two selectors for selectorType shadow_css'
        )
      end
    end

    rule(:selectorIndexes) do
      indexes = value
      next unless indexes

      if indexes.any?(&:negative?)
        key.failure(
          'must contain only integers greater than or equal to 0'
        )
      end
    end

    rule(:selectorSegments, :selectorIndexes) do
      segments = values[:selectorSegments]
      indexes = values[:selectorIndexes]

      next unless segments && indexes

      if segments.length != indexes.length
        key(:selectorIndexes).failure(
          'must contain exactly one index for each selector segment'
        )
      end
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:interval) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:rx) do
      key.failure('must be between 0 and 1') if value && (value.negative? || value > 1)
    end

    rule(:ry) do
      key.failure('must be between 0 and 1') if value && (value.negative? || value > 1)
    end
  end

  class Select < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:selectorType).filled(:string)
      required(:selectorSegments).array(:string)
      required(:selectorIndexes).array(:integer)
      required(:selectedIndex).filled(:integer)

      optional(:skip).filled(:bool)
      optional(:timeout).filled(:float)
      optional(:interval).filled(:float)
    end

    rule(:selectorType) do
      allowed = %w[css shadow_css]

      key.failure("must be one of: #{allowed.join(', ')}") if value && !allowed.include?(value)
    end

    rule(:selectorSegments) do
      key.failure('must contain at least one selector') if value.empty?

      key.failure('must contain only non-empty selectors') if value.any? { |segment| segment.strip.empty? }
    end

    rule(:selectorType, :selectorSegments) do
      type = values[:selectorType]
      segments = values[:selectorSegments]

      if type == 'css' && segments&.length != 1
        key(:selectorSegments).failure(
          'must contain exactly one selector for selectorType css'
        )
      end

      if type == 'shadow_css' && segments&.length.to_i < 2
        key(:selectorSegments).failure(
          'must contain at least two selectors for selectorType shadow_css'
        )
      end
    end

    rule(:selectedIndex) do
      key.failure('must be greater than or equal to 0') if value.negative?
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:interval) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:selectorIndexes) do
      if value.any?(&:negative?)
        key.failure(
          'must contain only integers greater than or equal to 0'
        )
      end
    end

    rule(:selectorSegments, :selectorIndexes) do
      segments = values[:selectorSegments]
      indexes = values[:selectorIndexes]

      next unless segments && indexes

      if segments.length != indexes.length
        key(:selectorIndexes).failure(
          'must contain exactly one index for each selector segment'
        )
      end
    end
  end

  class CopyCut < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:selectorType).filled(:string)
      required(:selectorSegments).array(:string)
      required(:selectorIndexes).array(:integer)

      required(:selectionStart).filled(:integer)
      required(:selectionEnd).filled(:integer)

      optional(:skip).filled(:bool)
      optional(:timeout).filled(:float)
      optional(:interval).filled(:float)
    end

    rule(:selectorType) do
      allowed = %w[css shadow_css]

      key.failure("must be one of: #{allowed.join(', ')}") if value && !allowed.include?(value)
    end

    rule(:selectorSegments) do
      key.failure('must contain at least one selector') if value.empty?

      key.failure('must contain only non-empty selectors') if value.any? { |segment| segment.strip.empty? }
    end

    rule(:selectorType, :selectorSegments) do
      type = values[:selectorType]
      segments = values[:selectorSegments]

      if type == 'css' && segments&.length != 1
        key(:selectorSegments).failure(
          'must contain exactly one selector for selectorType css'
        )
      end

      if type == 'shadow_css' && segments&.length.to_i < 2
        key(:selectorSegments).failure(
          'must contain at least two selectors for selectorType shadow_css'
        )
      end
    end

    rule(:selectionStart) do
      key.failure('must be greater than or equal to 0') if value.negative?
    end

    rule(:selectionEnd) do
      key.failure('must be greater than or equal to 0') if value.negative?
    end

    rule(:selectionStart, :selectionEnd) do
      if values[:selectionEnd] < values[:selectionStart]
        key(:selectionEnd).failure(
          'must be greater than or equal to selectionStart'
        )
      end
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:interval) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:selectorIndexes) do
      if value.any?(&:negative?)
        key.failure(
          'must contain only integers greater than or equal to 0'
        )
      end
    end

    rule(:selectorSegments, :selectorIndexes) do
      segments = values[:selectorSegments]
      indexes = values[:selectorIndexes]

      next unless segments && indexes

      if segments.length != indexes.length
        key(:selectorIndexes).failure(
          'must contain exactly one index for each selector segment'
        )
      end
    end
  end

  class ElementOuterHtml < Dry::Validation::Contract
    params do
      required(:id).filled(:string)
      required(:selectorType).filled(:string)
      required(:selectorSegments).array(:string)
      required(:selectorIndexes).array(:integer)

      optional(:skip).filled(:bool)
      optional(:timeout).filled(:float)
      optional(:interval).filled(:float)
    end

    rule(:selectorType) do
      allowed = %w[css shadow_css]

      key.failure("must be one of: #{allowed.join(', ')}") if value && !allowed.include?(value)
    end

    rule(:selectorSegments) do
      key.failure('must contain at least one selector') if value.empty?

      key.failure('must contain only non-empty selectors') if value.any? { |segment| segment.strip.empty? }
    end

    rule(:selectorType, :selectorSegments) do
      type = values[:selectorType]
      segments = values[:selectorSegments]

      if type == 'css' && segments&.length != 1
        key(:selectorSegments).failure(
          'must contain exactly one selector for selectorType css'
        )
      end

      if type == 'shadow_css' && segments&.length.to_i < 2
        key(:selectorSegments).failure(
          'must contain at least two selectors for selectorType shadow_css'
        )
      end
    end

    rule(:selectorIndexes) do
      if value.any?(&:negative?)
        key.failure(
          'must contain only integers greater than or equal to 0'
        )
      end
    end

    rule(:selectorSegments, :selectorIndexes) do
      segments = values[:selectorSegments]
      indexes = values[:selectorIndexes]

      next unless segments && indexes

      if segments.length != indexes.length
        key(:selectorIndexes).failure(
          'must contain exactly one index for each selector segment'
        )
      end
    end

    rule(:timeout) do
      key.failure('must be greater than 0') if value && value <= 0
    end

    rule(:interval) do
      key.failure('must be greater than 0') if value && value <= 0
    end
  end

  class Screenshot < Dry::Validation::Contract
    params do
      required(:id).filled(:string)

      optional(:full).filled(:bool)
      optional(:skip).filled(:bool)
    end
  end
end
