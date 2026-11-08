using FinancialMonitor.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace FinancialMonitor.Api.Hubs;

public sealed class TransactionHub(TransactionStore store) : Hub
{
    public const int SnapshotSize = 100;
    public const string SnapshotMethod = "snapshot";
    public const string TransactionMethod = "transaction";

    // Runs on every connect and reconnect, so a client never has a gap in its history.
    public override Task OnConnectedAsync() =>
        Clients.Caller.SendAsync(SnapshotMethod, store.GetLatest(SnapshotSize));
}
