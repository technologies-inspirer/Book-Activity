// Run Vite and Chrome with --remote-debugging-port=9222 before this browser check.
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.RESPONSIVE_URL || 'http://127.0.0.1:5173/Book-Activity/';
const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = targets.find(item => item.type === 'page');
if (!target) throw new Error('No Chrome page available on port 9222.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const result = JSON.parse(event.data);
  if (!result.id) return;
  const call = pending.get(result.id);
  pending.delete(result.id);
  result.error ? call.reject(new Error(result.error.message)) : call.resolve(result.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
await send('Page.enable');
await send('Runtime.enable');
await mkdir('tmp/responsive', { recursive: true });
const reports = [];
const sizes = [[320, 740], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [844, 390]];
async function check(route, width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await evaluate(`location.hash = ${JSON.stringify(route)}`);
  await wait(route.includes('/read/') ? 850 : 160);
  await evaluate('Promise.race([document.fonts.ready.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 1500))])');
  const metrics = await evaluate(`(() => {
    const w = document.documentElement.clientWidth;
    return { width: w, scrollWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        if (!r.width || !r.height || s.visibility === 'hidden' || el.closest('[hidden],[inert],.learning-scenery,svg,.b3d,.book,.sheet,.shelf,.fx')) return false;
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          if (['hidden','auto','scroll','clip'].includes(getComputedStyle(parent).overflowX)) return false;
          parent = parent.parentElement;
        }
        return r.right > w + 2 || r.left < -2;
      }).slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 50) })) };
  })()`);
  reports.push({ route, width, height, ...metrics });
  if (metrics.scrollWidth > width + 2 || metrics.overflow.length) console.log(JSON.stringify(reports.at(-1)));
  if ((width === 390 || width === 768) && ['#/user/library/play-group/stemford', '#/admin/overview', '#/book/new-stemford-english-3/read/1'].includes(route)) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`tmp/responsive/${route.replace(/[^a-z0-9]/gi, '-')}-${width}.png`, Buffer.from(shot.data, 'base64'));
  }
}
async function login(role) {
  await send('Page.navigate', { url: base });
  await until('!!document.querySelector("#login-email")');
  for (const [width, height] of sizes) await check('#/login', width, height);
  await evaluate(`(() => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [selector, value] of [['#login-email', '${role === 'admin' ? 'admin' : 'reader'}@javed.example'], ['#login-password', '${role === 'admin' ? 'Admin' : 'Reader'}Demo!2026']]) {
      const input = document.querySelector(selector); set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  })()`);
  await evaluate('document.querySelector("form").requestSubmit()');
  await until('!document.querySelector("#login-email")');
}
try {
  await login('user');
  const userRoutes = ['#/user', '#/user/library', '#/user/library/play-group/stemford', '#/user/library/play-group/stemford/english', '#/user/profile', '#/user/school', '#/user/resources', '#/book/new-stemford-english-3/read/1', '#/book/stemford-maths-3/read/1', '#/book/stemford-urdu-3/read/1'];
  for (const [width, height] of sizes) for (const route of userRoutes) await check(route, width, height);
  await login('admin');
  const adminRoutes = ['overview', 'schools', 'schools/new', 'books', 'series', 'subjects-books', 'assign-subject-to-classes', 'classes-subjects', 'profile', 'pdf-activities'];
  for (const [width, height] of sizes) for (const route of adminRoutes) await check(`#/admin/${route}`, width, height);
  await writeFile('tmp/responsive/report.json', JSON.stringify(reports, null, 2));
  const failures = reports.filter(item => item.scrollWidth > item.width + 2 || item.overflow.length);
  console.log(`${reports.length} layouts checked; ${failures.length} overflow failures. Screenshots: tmp/responsive`);
  if (failures.length) process.exitCode = 1;
} finally { socket.close(); }
