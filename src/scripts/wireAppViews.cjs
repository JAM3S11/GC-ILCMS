const fs = require('fs');
const path = require('path');

// ---------- 1) LOCATE the real views file that actually exports the 3 views ----------
const receptionDir = 'src/components/reception';
let viewsFile = null;
for (const f of fs.readdirSync(receptionDir)) {
  if (!/\.tsx$/.test(f)) continue;
  const body = fs.readFileSync(path.join(receptionDir, f), 'utf8');
  if (
    body.includes('export const LabBayView') &&
    body.includes('export const CheckOutView') &&
    body.includes('export const NotificationsView')
  ) {
    viewsFile = f;
    break;
  }
}
if (!viewsFile) {
  console.error('FATAL: no views file exports all three views');
  process.exit(1);
}
console.log('REAL VIEWS FILE:', viewsFile);

// ---------- 2) extract actual prop names from the real interfaces ----------
const vtxt = fs.readFileSync(path.join(receptionDir, viewsFile), 'utf8');
function interfaceBody(name) {
  const i = vtxt.indexOf('interface ' + name);
  if (i === -1) throw new Error('interface ' + name + ' MISSING');
  const open = vtxt.indexOf('{', i);
  const close = vtxt.indexOf('}', open);
  return vtxt.slice(open + 1, close);
}
const labBy = interfaceBody('LabBayViewProps');
const coPy = interfaceBody('CheckOutViewProps');
const nvRy = interfaceBody('NotificationsViewProps');
console.log('LabBayViewProps:', labBy);
console.log('CheckOutViewProps:', coPy);
console.log('NotificationsViewProps:', nvRy);

const labProp = (nm) => (new RegExp('\\b' + nm + '\\s*\\?\\s*:').test(labBy) ? nm : null);
const coProp = (nm) => (new RegExp('\\b' + nm + '\\s*\\?\\s*:').test(coPy) ? nm : null);
const nvProp = (nm) => (new RegExp('\\b' + nm + '\\s*\\?\\s*:').test(nvRy) ? nm : null);

// ---------- 3) read App.tsx END-TO-END (single structure) ----------
const AP = 'src/App.tsx';
let appContents = fs.readFileSync(AP, 'utf8');

// confirm real handler names
const hasHandler = (nm) => appContents.includes(nm);
const hSendPhys = 'handleSendLabNotification';
const hCheckOut = 'handleCheckOutVisitor';
if (!hasHandler(hSendPhys) || !hasHandler(hCheckOut)) {
  console.error('FATAL: handler names wrong:', hSendPhys, hasHandler(hSendPhys), hCheckOut, hasHandler(hCheckOut));
  process.exit(1);
}
console.log('handlers confirmed:', hSendPhys, hCheckOut);

// notification helpers
const notifState = appContents.includes('notifications');
const setNotifState = appContents.includes('setNotifications');
const unreadOpen = appContents.includes('notificationsOpen');
const setUnreadOpen = appContents.includes('setNotificationsOpen');
if (!(notifState && setNotifState && unreadOpen && setUnreadOpen)) {
  console.error('FATAL: notification state wrong');
  process.exit(1);
}

// find import anchor + insert the import of the real views file
const impAnchor = "import { VisitorDeskView } from './components/reception/VisitorDeskView';";
const ia = appContents.indexOf(impAnchor);
if (ia === -1) {
  console.error('FATAL: import anchor missing');
  process.exit(1);
}
const importLine =
  "import { LabBayView, CheckOutView, NotificationsView } from './components/reception/" +
  viewsFile.replace('.tsx', '') +
  "';\n";
appContents = appContents.slice(0, ia + impAnchor.length) + '\n' + importLine + appContents.slice(ia + impAnchor.length);

// find the route-branch insertion anchor: the laboratory branch container start
const labAnchor = "{activeView === 'laboratory' && (";
const la = appContents.indexOf(labAnchor);
if (la === -1) {
  console.error('FATAL: laboratory branch anchor missing');
  process.exit(1);
}

// build the three new branches (only using props we proved exist on the views)
const labBayBranch =
  "\n\n            {activeView === 'lab-bay' && (\n" +
  "              <LabBayView\n" +
  "                visitors={visitors}\n" +
  (labProp('onNotifyLab') ? "                onNotifyLab={" + hSendPhys + "}\n" : '') +
  "                onProceedToLab={(v) => {\n" +
  "                  setActiveView('laboratory');\n" +
  "                  showToast(`Proceeded to Laboratory Workspace for ${v.officerName}.`);\n" +
  "                }}\n" +
  (labProp('currentUserName') ? "                currentUserName={currentUser.name}\n" : '') +
  "              />\n" +
  "            )}\n";

const checkOutBranch =
  "\n            {activeView === 'check-out' && (\n" +
  "              <CheckOutView\n" +
  "                visitors={visitors}\n" +
  (coProp('onCheckOut') ? "                onCheckOut={" + hCheckOut + "}\n" : '') +
  "                onProceedToLab={(v) => {\n" +
  "                  setActiveView('laboratory');\n" +
  "                  showToast(`Proceeded to Laboratory Workspace for ${v.officerName}.`);\n" +
  "                }}\n" +
  "              />\n" +
  "            )}\n";

const notifBranch =
  "\n            {activeView === 'notifications' && (\n" +
  "              <NotificationsView\n" +
  "                notifications={notifications}\n" +
  (nvProp('onMarkAllAsRead')
    ? "                onMarkAllAsRead={() => {\n                  const marked = notifications.map((n) => (n.read ? n : { ...n, read: true }));\n                  setNotifications(marked);\n                  showToast('All notifications marked as read.');\n                }}\n"
    : '') +
  (nvProp('onSelect')
    ? "                onSelect={(n) => {\n                  setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));\n                  showToast(`Opened ${n.title}.`);\n                }}\n"
    : '') +
  "                unreadCount={notifications.filter((n) => !n.read).length}\n" +
  "              />\n" +
  "            )}\n";

appContents = appContents.slice(0, la) + labBayBranch + checkOutBranch + notifBranch + appContents.slice(la);

fs.writeFileSync(AP, appContents);

// ---------- 4) VERIFY from the written file (re-read, not echo) ----------
const verify = fs.readFileSync(AP, 'utf8');
for (const c of ['LabBayView', 'CheckOutView', 'NotificationsView', hSendPhys, hCheckOut, "activeView === 'lab-bay'", "activeView === 'check-out'", "activeView === 'notifications'", "onMarkAllAsRead", "unreadCount=", viewsFile.replace('.tsx', '')]) {
  if (!verify.includes(c)) { console.error('VERIFY-MISS:', c); process.exit(1); }
}
console.log('ALL VERIFIED — App.tsx bytes now', verify.length);
