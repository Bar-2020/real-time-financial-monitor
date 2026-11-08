using System.ComponentModel.DataAnnotations;

namespace FinancialMonitor.Api.Options;

internal sealed class PendingResolutionOptions : IValidatableObject
{
    [Range(0, int.MaxValue - 1)]
    public int MinDelayMs { get; init; }

    [Range(0, int.MaxValue - 1)]
    public int MaxDelayMs { get; init; }

    [Range(0.0, 1.0)]
    public double FailureRate { get; init; }

    // Runs only when every property above is valid. Random.Next throws if the range is backwards.
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MinDelayMs > MaxDelayMs)
            yield return new ValidationResult("MinDelayMs must not be greater than MaxDelayMs.", [nameof(MinDelayMs), nameof(MaxDelayMs)]);
    }
}
