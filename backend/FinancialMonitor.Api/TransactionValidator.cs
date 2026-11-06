using FluentValidation;

namespace FinancialMonitor.Api;

public sealed class TransactionValidator : AbstractValidator<Transaction>
{
    public TransactionValidator()
    {
        RuleFor(t => t.TransactionId).NotEmpty();
        RuleFor(t => t.Amount).GreaterThan(0);
        // \z rather than $, which would also accept a trailing newline.
        RuleFor(t => t.Currency).NotEmpty().Matches(@"^[A-Z]{3}\z");
        RuleFor(t => t.Status).IsInEnum();
        RuleFor(t => t.Timestamp).NotEmpty();
    }
}
