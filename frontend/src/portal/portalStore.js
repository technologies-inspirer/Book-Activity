const defaults = { name: 'Javed Publishers', description: 'Publishing company', email: '', address: '', country: '', state: '', city: '', logo: 'assets/logo.png', letterHead: 'assets/logo.png' };
const localExpiry = value => {
  if (!value) return '';
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};
const fromApi = account => ({ ...account, expiresAt: localExpiry(account.expiresAt), expires: account.expiresAt ? localExpiry(account.expiresAt).slice(0, 10) : '', modules: account.modules || ['Books'], principals: account.principals || [] });
function toApi(input) {
  const result = { ...input };
  if (result.access) result.access = toApi(result.access);
  if ('expiresAt' in result || 'expires' in result) {
    const value = result.expiresAt || (result.expires ? `${result.expires}T23:59:59` : '');
    result.expiresAt = value ? new Date(value).toISOString() : '';
    delete result.expires;
  }
  return result;
}

export function createPortalStore() {
  let state = { loading: true, bootError: '', currentId: null, accounts: [], customSeries: [], customSubjects: [], subjectAssignments: [], seriesClasses: [], publishedBooks: [], progress: {}, organizationProfile: defaults };
  let csrfToken = '';
  let progressTimer;
  let initializing;
  const listeners = new Set();
  const publish = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const clear = () => { clearTimeout(progressTimer); csrfToken = ''; publish({ currentId: null, accounts: [], progress: {} }); };
  async function request(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetch(`/api${path}`, {
        method, credentials: 'same-origin', headers: { ...(body !== undefined ? { 'Content-Type': body instanceof Blob ? 'application/zip' : 'application/json' } : {}), ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
        ...(body !== undefined ? { body: body instanceof Blob ? body : JSON.stringify(body) } : {}), signal: path.startsWith('/admin/library/') || path.startsWith('/library/books/') ? undefined : AbortSignal.timeout(path === '/admin/users/import' ? 120000 : 30000)
      });
    } catch { throw new Error('Cannot reach the server. Please check your connection and try again.'); }
    if (response.ok && response.headers.get('content-type')?.includes('application/zip')) return response.blob();
    let data;
    try { data = await response.json(); } catch { throw new Error('The server returned an unexpected response. Please try again.'); }
    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/login') clear();
      const error = new Error(data.error || 'Your changes could not be saved. Please try again.'); error.status = response.status; throw error;
    }
    if (data.csrfToken) csrfToken = data.csrfToken;
    return data;
  }
  const accept = value => {
    const account = fromApi(value);
    publish({ accounts: [...state.accounts.filter(item => item.id !== account.id), account] });
    return account;
  };
  async function hydrate(account) {
    const [users, progress, organization, learning] = await Promise.all([
      account.role === 'admin' ? request('/admin/users') : Promise.resolve({ accounts: [account] }),
      request('/me/progress'), request('/organization'), request('/learning')
    ]);
    publish({ ...learning, accounts: users.accounts.map(fromApi), currentId: account.id, progress: progress.progress ? { [account.id]: progress.progress } : {}, organizationProfile: { ...defaults, ...organization.profile } });
  }
  async function refresh() {
    const { account } = await request('/auth/me');
    if (state.currentId !== account.id) await hydrate(account);
    else {
      accept(account);
      publish(await request('/learning'));
      if (account.role === 'admin') { const data = await request('/admin/users'); publish({ accounts: data.accounts.map(fromApi) }); }
    }
  }
  const update = async (id, input) => { const data = await request(`/admin/users/${id}`, { method: 'PATCH', body: toApi(input) }); return accept(data.account); };
  const own = async body => { const data = await request('/me', { method: 'PATCH', body }); return accept(data.account); };
  const organization = async body => { await request('/organization', { method: 'PATCH', body }); publish({ organizationProfile: { ...state.organizationProfile, ...body } }); };
  return {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }, snapshot: () => state,
    initialize() {
      if (initializing) return initializing;
      publish({ loading: true, bootError: '' });
      initializing = refresh().catch(error => { if (error.status !== 401) publish({ bootError: error.message }); }).finally(() => { publish({ loading: false }); initializing = null; });
      return initializing;
    },
    refresh,
    async createSeries(input) {
      const result = await request('/admin/learning/series', { method: 'POST', body: input });
      publish(result.state); return result.created;
    },
    async assignSeriesClasses(input) {
      const result = await request('/admin/learning/classes', { method: 'POST', body: input }); publish(result.state);
    },
    async assignClassSubjects(input) {
      const result = await request('/admin/learning/subjects', { method: 'POST', body: input }); publish(result.state);
    },
    async publishBook(archive, id) {
      const result = await request(`/admin/library/books${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: archive });
      publish({ publishedBooks: result.publishedBooks }); return result.id;
    },
    loadPublishedBook(id) { return request(`/library/books/${id}/archive`); },
    searchCities(state, query) { return request(`/locations/cities?state=${encodeURIComponent(state)}&q=${encodeURIComponent(query)}`); },
    async signIn(email, password) {
      const { account } = await request('/auth/login', { method: 'POST', body: { email, password } });
      await hydrate(account); return account.role;
    },
    async signOut() { try { await request('/auth/logout', { method: 'POST', body: {} }); clear(); } catch (error) { if (error.status !== 401) throw error; } },
    async createUser(input) { const data = await request('/admin/users', { method: 'POST', body: toApi(input) }); accept(data.account); return data.account.id; },
    async importSchools(inputs) { const data = await request('/admin/users/import', { method: 'POST', body: { accounts: inputs.map(toApi) } }); data.accounts.forEach(accept); return data.accounts.map(account => account.id); },
    updateSchool: update,
    updateAccess(id, input) {
      return update(id, { access: { allBooks: input.allBooks, bookIds: input.bookIds, expires: input.expires || '', expiresAt: input.expiresAt || '' } });
    },
    async setSchoolsEnabled(ids, enabled) { for (const id of ids) await update(id, { enabled }); },
    async toggleEnabled(id) { const account = state.accounts.find(item => item.id === id); await update(id, { enabled: !account.enabled }); },
    async setHeadSchool(id) { const current = state.accounts.find(item => item.id === id); await update(id, { isHeadSchool: !current.isHeadSchool }); const data = await request('/admin/users'); publish({ accounts: data.accounts.map(fromApi) }); },
    async resetPassword(id, password) { await request(`/admin/users/${id}/reset-password`, { method: 'POST', body: { password } }); },
    updateProfile: own,
    updateSchoolProfile: schoolProfile => own({ schoolProfile }),
    updateSchoolLogo: schoolLogo => own({ schoolLogo }),
    updateOrganizationProfile: organization,
    updateOrganizationImage: (key, value) => organization({ [key]: value }),
    async changePassword(current, password) { await request('/me/password', { method: 'POST', body: { current, password } }); },
    rememberPosition(bookId, page) {
      if (!state.currentId) return;
      publish({ progress: { ...state.progress, [state.currentId]: { bookId, page } } });
      clearTimeout(progressTimer);
      progressTimer = setTimeout(() => request('/me/progress', { method: 'PUT', body: { bookId, page } }).catch(() => {}), 400);
    }
  };
}
