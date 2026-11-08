using FinancialMonitor.Api.Models;
using FluentValidation;

namespace FinancialMonitor.Api.Validators;

public sealed class TransactionValidator : AbstractValidator<Transaction>
{
    public TransactionValidator()
    {
        RuleFor(t => t.TransactionId).NotEmpty();
        RuleFor(t => t.Amount).GreaterThan(0);
        RuleFor(t => t.Currency).NotEmpty().Matches(@"^[A-Z]{3}\z");
        RuleFor(t => t.Status).IsInEnum();
        RuleFor(t => t.Timestamp).NotEmpty();
    }
}
