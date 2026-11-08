using FinancialMonitor.Api.Hubs;
using FinancialMonitor.Api.Models;
using Microsoft.AspNetCore.SignalR;

namespace FinancialMonitor.Api.Services;

public sealed class TransactionProcessor(TransactionStore store, IHubContext<TransactionHub> hub)
{
    public async Task ApplyAsync(Transaction transaction)
    {
        if (store.Upsert(transaction))
            await hub.Clients.All.SendAsync(TransactionHub.TransactionMethod, transaction);
    }
}
