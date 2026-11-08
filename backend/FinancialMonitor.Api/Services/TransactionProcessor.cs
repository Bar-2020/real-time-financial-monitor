using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace FinancialMonitor.Api.Services;

internal sealed class TransactionProcessor(TransactionStore store, IHubContext<TransactionHub> hub)
{
    public async Task<bool> ApplyAsync(Transaction transaction)
    {
        if (!store.Upsert(transaction)) return false;

        await hub.Clients.All.SendAsync(TransactionHub.TransactionMethod, transaction);
        return true;
    }
}
