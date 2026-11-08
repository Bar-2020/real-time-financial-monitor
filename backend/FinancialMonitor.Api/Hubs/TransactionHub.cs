using FinancialMonitor.Api.Options;
using FinancialMonitor.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace FinancialMonitor.Api.Hubs;

internal sealed class TransactionHub(TransactionStore store, IOptions<TransactionHubOptions> options) : Hub
{
    private const string SnapshotMethod = "snapshot";
    public const string TransactionMethod = "transaction";

    public override Task OnConnectedAsync() =>
        Clients.Caller.SendAsync(SnapshotMethod, store.GetLatest(options.Value.SnapshotSize));
}
