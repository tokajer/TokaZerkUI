# DAoC Engine Events

All known `<OnClickEvent>` / `<onClickEvent>` values used across the TokaZerk UI.
These are hardcoded engine event names — they are not arbitrary strings and cannot execute slash commands.

---

## Window Toggles

| Event | Window |
|---|---|
| `ToggleSummary` | Old summary window |
| `ToggleNewSummary` | New summary window |
| `ToggleFloatTarget` | Floating target window |
| `ToggleFloatLevelXP` | Floating level XP window |
| `ToggleFloatRealmXP` | Floating realm XP window |
| `ToggleFloatChampXP` | Floating champion XP window |
| `ToggleMiniPet` | Mini pet window |
| `ToggleQuiver` | Quiver window |
| `ToggleTitle` | Title window |
| `ToggleMount` | Mount window |
| `ToggleCommandWindow` | Command window |
| `ToggleMenuBar` | Menu bar |
| `ToggleClock` | Clock window |
| `ToggleCompassWindow` | Compass window (custom) |
| `ToggleCompass` | Compass window (native) |
| `TogglePerformanceMeter` | Performance window |
| `ToggleConcentration` | Concentration window |
| `ToggleGroupBuffs` | Group buffs window |
| `ToggleNewGroup` | New/floating group window |
| `ToggleMiniGroup` | Mini group window |
| `ToggleMiniFriends` | Mini friends window |
| `ToggleMasterLevel` | Master level window |
| `ToggleJournal` | Quest journal |
| `ToggleMap` | Map window |
| `ToggleOptions` | Options window |
| `ToggleBonuses` | Realm bonuses window |
| `ToggleCustom0` – `ToggleCustom19` | Custom windows 0–19 |
| `ToggleAttackMode` | Toggle attack/combat mode |
| `ToggleSitting` | Toggle sitting |

---

## Navigation / World

| Event | Action |
|---|---|
| `ShowWarmap` / `ShowWarMap` | Open realm war map |
| `WarmapUpdateBonuses` | Realm war bonuses |
| `Realm` | Keep status / realm war overview |
| `Relic` | Relic status window |
| `Bonuses` | Realm/character bonuses |

---

## Character Actions

| Event | Action |
|---|---|
| `Sprint` | Toggle sprint |
| `Follow` | Follow target |
| `Stick` | Stick to target |
| `Face` | Face target |
| `Pray` | Pray (at gravestone) |
| `Release` | Release after death |
| `Bind` | Bind at current location |
| `Afk` | Toggle AFK |
| `Quit` | Quit game |
| `Train` | Open trainer (daoc_subclass_window) |
| `Task` | Open task window |

---

## Social / Community

| Event | Action |
|---|---|
| `Friends` | Open friends list |
| `Community` | Open social/community window |
| `Journal` | Quest journal (alt event name) |
| `Help` | Help window |

---

## Group

| Event | Action |
|---|---|
| `GroupInvite` | Invite to group |
| `SelectGroupMember0` – `SelectGroupMember7` | Select group member slot 0–7 |

---

## Configuration

| Event | Action |
|---|---|
| `ShowKeyboardConfig` | Open keyboard config window |
| `WindowAlphaDecrease` / `WindowAlphaIncrease` | Window transparency |
| `FontAlphaDecrease` / `FontAlphaIncrease` | Font transparency |
| `AlphaSettingsAccept` / `AlphaSettingsCancel` | Confirm/cancel alpha changes |

---

## Chat

| Event | Action |
|---|---|
| `ChatRenameOK` / `ChatRenameCancel` | Confirm/cancel chat tab rename |
| `ContextOnAddChatWindow` | Add a new chat window |
| `ContextOnDeleteChatWindow` | Delete a chat window |
| `ContextOnRenameChatWindow` | Rename a chat window |
| `ContextOnMessageAndChannel` | Chat channel context action |
| `ContextOnWindowAlpha` | Window alpha context action |
| `ContextOnFontAlpha` | Font alpha context action |
| `ContextOnFontSize` | Font size context action |
| `ContextOnDefaultChannel` | Set default channel |
| `ContextSetWindowAlpha` | Apply window alpha |
| `ContextSetFontAlpha` | Apply font alpha |
| `ContextSetFontSize` | Apply font size |
| `ContextSetDefaultChannel` | Apply default channel |

---

## Guild / Community Panel

| Event | Action |
|---|---|
| `ComTabRefresh` | Refresh community tab |
| `ComGuildWithdraw` | Withdraw from guild |
| `ComGuildCommands` | Guild commands panel |
| `ComGuildMemberSelected` | Guild member selected |
| `ComGuildMembersShowOffline` | Show offline guild members |
| `ComGuildPromote` / `ComGuildDemote` | Promote/demote member |
| `ComGuildNote` | Edit member note |
| `ComGuildSend` | Send guild message |
| `ComGuildMembersPrev` / `ComGuildMembersNext` | Guild member list paging |
| `ComGuildBannerDeploy` | Deploy guild banner |
| `ComAllianceMemberSelected` | Alliance member selected |
| `ComAllianceMembersShowOffline` | Show offline alliance members |
| `ComAllianceSend` | Send alliance message |
| `ComAllianceMembersPrev` / `ComAllianceMembersNext` | Alliance member list paging |
| `ComFriendsMemberSelected` | Friends member selected |
| `ComFriendsSend` | Send friends message |
| `ComLFGuildMemberSelected` | LF-guild member selected |
| `ComLFGuildInvite` | Invite LF-guild member |
| `ComLFGuildSend` | Send LF-guild message |

---

## Notes

- All events are **hardcoded in the game engine** — unknown event names are silently ignored
- There is **no mechanism** to execute slash commands (e.g. `/chatlog`) from a button
- Empty `<OnClickEvent>` tags are valid — the engine manages the button behavior natively (used in chat_config_window, bazaar_query, etc.)
- `Togglecustom14` / `Togglecustom19` appear lowercased in custom14_window.xml — event names appear to be case-insensitive in the engine
