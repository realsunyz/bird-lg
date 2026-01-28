export function renderRouteQuery(): string {
  return `
    <div class="space-y-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">BIRD Command</span>
          <span class="label-text-alt">
            <kbd class="kbd kbd-sm">Enter</kbd> to execute
          </span>
        </label>
        <div class="join w-full">
          <select id="route-preset" class="select select-bordered join-item w-48">
            <option value="">Custom Command</option>
            <option value="show route for ">show route for [IP]</option>
            <option value="show route where net ~ ">show route where net ~</option>
            <option value="show route protocol ">show route protocol [name]</option>
            <option value="show route table ">show route table [name]</option>
            <option value="show protocols all">show protocols all</option>
            <option value="show status">show status</option>
            <option value="show memory">show memory</option>
          </select>
          <input 
            type="text" 
            id="route-input" 
            class="input input-bordered join-item flex-1" 
            placeholder="show route for 8.8.8.8"
          />
          <button id="route-submit" class="btn btn-primary join-item">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Execute
          </button>
        </div>
      </div>
      
      <div id="route-result" class="hidden">
        <!-- Results will be rendered here -->
      </div>
    </div>
  `;
}

export function renderRouteResult(
  server: string,
  data: string,
  error?: string,
): string {
  if (error) {
    return `
      <div class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>${escapeHtml(error)}</span>
      </div>
    `;
  }

  return `
    <div class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          ${escapeHtml(server)}
        </h3>
        <pre class="code-output">${escapeHtml(data)}</pre>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
