using System.ComponentModel.DataAnnotations;
using FinancialMonitor.Api.Services;

namespace FinancialMonitor.Api.Options;

internal sealed class TransactionHubOptions
{
    // More than the store holds would only ever return the same rows.
    [Range(1, TransactionStore.Capacity)]
    public int SnapshotSize { get; init; }
}
