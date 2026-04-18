# Invite Share Button — Design Spec
**Date:** 2026-04-18
**Scope:** Add a Share button to the invite code section in GroupsPage

## Problem
Users can only copy the invite code manually. No quick way to share via WhatsApp or native share sheet.

## Solution
A `ShareButton` component placed next to `CopyButton` in the invite code row.

**Behaviour:**
- If `navigator.share` is available (mobile/modern browser) → use Web Share API (opens native share sheet)
- Otherwise → open WhatsApp deep link in new tab

**Share text:**
```
Join my "[Group Name]" savings circle on ContriTrack!
Use invite code: [CODE]
```

**WhatsApp URL:** `https://wa.me/?text=<encoded message>`

## Component
```jsx
function ShareButton({ groupName, inviteCode }) {
  const message = `Join my "${groupName}" savings circle on ContriTrack!\nUse invite code: ${inviteCode}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    }
  };

  return (
    <button onClick={handleShare} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 7,
      border: '1px solid rgba(37,211,102,0.3)',
      background: 'rgba(37,211,102,0.07)',
      color: '#128c7e',
      fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
    }}>
      <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.845L.057 23.547a.5.5 0 00.608.608l5.702-1.472A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.666-.523-5.181-1.432l-.371-.221-3.384.873.893-3.268-.242-.381A9.944 9.944 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
      </svg>
      Share
    </button>
  );
}
```

## Placement
In the invite code row, the `<div onClick={e => e.stopPropagation()}>` that wraps `CopyButton` gets `ShareButton` added alongside it:

```jsx
<div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
  <CopyButton text={group.inviteCode} />
  <ShareButton groupName={group.name} inviteCode={group.inviteCode} />
</div>
```

## Files Changed
| File | Change |
|------|--------|
| `client/src/pages/GroupsPage.jsx` | Add `ShareButton` component, use in invite code row |
