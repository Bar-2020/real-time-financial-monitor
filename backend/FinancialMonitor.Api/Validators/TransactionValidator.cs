using System.Text.RegularExpressions;
using FinancialMonitor.Api.Models;

namespace FinancialMonitor.Api.Validators;

internal static class TransactionValidator
{
    /// <returns>The invalid fields by JSON name, empty if the transaction is valid.</returns>
    public static Dictionary<string, string[]> Validate(Transaction transaction)
    {
        var errors = new Dictionary<string, string[]>();
        if (transaction.TransactionId == Guid.Empty) errors["transactionId"] = ["Must not be empty."];
        if (transaction.Amount <= 0) errors["amount"] = ["Must be greater than 0."];
        if (!Regex.IsMatch(transaction.Currency ?? "", @"^[A-Z]{3}\z")) errors["currency"] = ["Must be three capital letters."];
        if (!Enum.IsDefined(transaction.Status)) errors["status"] = ["Must be Pending, Completed or Failed."];
        if (transaction.Timestamp == default) errors["timestamp"] = ["Must be set."];
        return errors;
    }
}
