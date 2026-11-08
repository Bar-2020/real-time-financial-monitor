using FinancialMonitor.Api.Options;
using FinancialMonitor.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace FinancialMonitor.Api.Hubs;

internal sealed class TransactionHub(TransactionStore store, IOptions<TransactionHubOptions> options) : Hub
{
    // Wire names the frontend listens on, so they stay strings. An enum would need a name conversion at every send.
    private const string SnapshotMethod = "snapshot";
    public const string TransactionMethod = "transaction";

    // Runs on every connect and reconnect, so a client never has a gap in its history.
    public override Task OnConnectedAsync() =>
        Clients.Caller.SendAsync(SnapshotMethod, store.GetLatest(options.Value.SnapshotSize));
}
