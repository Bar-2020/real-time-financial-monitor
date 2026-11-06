using Microsoft.AspNetCore.SignalR;

namespace FinancialMonitor.Api;

public sealed class TransactionProcessor(TransactionStore store, IHubContext<TransactionHub> hub)
{
    public async Task ApplyAsync(Transaction tx)
    {
        if (store.Upsert(tx))
            await hub.Clients.All.SendAsync(TransactionHub.TransactionMethod, tx);
    }
}
