# Paean and 8x integration

Paean JS is the game engine layer. The canonical **Paean Web SDK** (`paean-sdk.js`, helper global `PaeanSDK`, host contract 1.10) supplies platform services inside Paean / 8x. They are distinct packages. The engine does not implement the native transport, inject a fake bridge, manage credentials, or contact private endpoints.

For a hosted game, include the current canonical `paean-sdk.js` using the platform's normal distribution process. It is not copied into this open-source engine package. In a normal browser without it, the examples still work locally. Contract details were checked against SDK 1.10.0; different hosts can expose different namespaces.

## Explicit user intent

```js
const platform = new PaeanPlatform({ namespace: 'my-game-v1' });
const save = platform.loadLocal('save', { best: 0 });

playButton.addEventListener('click', async () => {
  const access = await platform.requireAccess();
  if (access.unlocked) startGame();
  else keepDemoRunning();
});

syncButton.addEventListener('click', async () => {
  await platform.connect(['storage.kv']);
  const result = await platform.syncSave('save', currentSave, (cloud, local) => ({
    best: Math.max(cloud?.best ?? 0, local.best),
  }));
  applySave(result.value);
  showSyncState(result.synced);
});
```

Construction performs no requests or prompts. `mode` is `local`, `preview`, or `paean`. The SDK provider is resolved on every operation so late injection works without reconstructing the game. `connect(scopes)` is the only consent convenience call: invoke it from an intentional action. It requests scopes separately and reports each grant, surviving partial grants and wholesale scope rejection. It does not implicitly request unrelated capabilities or retry prompts.

## Preview and paid access

Feed previews may have `window.__paeanPreview === true` and no bridge. Keep an attract/demo loop running. `requireAccess`, `connect`, cloud sync, and score delivery do not contact account-bound services in preview. The host later changes preview state and injects the bridge.

Call `requireAccess(sku?)` on the first intentional play/purchase action. The canonical access helper owns prices, entitlement checks, confirmation, and standalone manifest policy. A declined or failed request returns a locked result; keep the demo and retry entry visible. Durable products must use host ownership, never a local flag.

When no canonical helper exists, free local play defaults to allowed. Configure `localAccess: 'demo'` to keep a paid application's standalone fallback locked. A named product is never granted by the local fallback. A canonical standalone access helper is called even when it reports no native host, so its manifest/redirect policy is respected. `localAccess` is demo behavior, not entitlement enforcement.

## Saves

`loadLocal(key, fallback)` and `saveLocal(key, value)` use JSON and an application-specific namespace. Inaccessible storage, quota failures, and corrupt JSON fall back to memory/defaults. Values must be JSON serializable; validate application schemas on load. `$scores` is reserved for the adapter's offline score queue. Local persistence is device/browser-bound and is not a secure storage boundary.

`syncSave(key, local, merge)` saves locally before attempting cloud synchronization. It only uses an already granted `storage.kv` scope. The adapter reads cloud state first, applies your merge policy to cloud and the latest local state, saves the merged state locally, and writes to the host. A failed cloud read never triggers a write. Missing keys are treated as null. The canonical helper supplies normalized storage values; the engine does not unwrap arbitrary user objects with a `value` property.

Same-key sync operations are serialized within one adapter. Local changes made during the cloud read are included. If gameplay changes local state during the cloud write, the returned `synced` flag is false and the current local value is retained; explicitly sync again later. Across tabs/devices, storage KV has no compare-and-swap guarantee: use an application merge appropriate to the data, or the host's versioned shared/state services when atomic conflict handling is required.

The SDK does not choose last-write-wins for inventories, silently overwrite unread progress, schedule periodic cloud uploads, or migrate your save schema. Keep saves compact and throttle calls at the application layer. Supply an `onError` callback for actionable UI/logging.

## Leaderboards

`submitScore(board, score, metadata?)` queues locally and attempts delivery only if `storage.leaderboard` is already granted. `flushScores()` retries queued submissions and returns the delivered count. The queue holds at most 100 entries; overflow rejects rather than silently dropping scores. Concurrent delivery is serialized within one adapter.

Delivery is **at least once**, because a host may accept a score while its reply is lost. Use a best-score board; no host idempotency guarantee is invented here. Multi-tab coordination and server-authoritative score validation are application concerns. Do not treat local scores as trusted in competitive or paid contexts.

## Other host services

`service<T>(name)` feature-detects the current canonical helper namespace. Missing surfaces throw `PlatformUnavailableError` with `code === 'sdk-too-old'`, not an accidental TypeError. The caller then uses the canonical API and its consent rules:

| Namespace | Typical scope / responsibility |
| --- | --- |
| `leaderboard` | `storage.leaderboard`; use host get/rank APIs |
| `shared` | `storage.shared.read` / `storage.shared.write`; versioned shared data |
| `account` | `account.profile`; minimal player profile |
| `room` | `net.room`; messages and server-authoritative room state |
| `ai`, `agent` | Request the documented feature-specific scope on first use |
| `ads` | `ads.rewarded`; grant rewards only when the result confirms them |
| `pay` | `pay.spend`; host confirmation and a stable idempotency key per purchase intent |
| `access` | Host-owned access sheet; no scope; durable ownership remains server-side |

These are capability forwarding points, not reimplementations of those services. Respect the canonical SDK version available in each host. Single-player/local gameplay should survive unavailable, denied, quota-limited, and disconnected services.

## Host chrome and cleanup

Use `viewport-fit=cover`. Reserve safe space with the host's CSS variables, each with a `0px` fallback: `--paean-safe-top`, `--paean-safe-bottom`, and `--paean-chrome-inset-top`. Interactive HUDs near the top-right should also account for the host capsule via `window.paean.chromeRect()`/`safeArea()` and `paeanchromechange` when available. These are optional host contracts, not engine APIs.

Call `dispose()` when leaving the application. Already submitted host requests cannot be canceled by the engine. Tests cover local mode, preview, late injection, partial grants, missing storage, read failure, quota fallback, missing namespaces, concurrent saves, score retries, and access decline. Browser tests exercise a mock access helper; real native-host acceptance remains a release integration task.
