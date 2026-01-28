export function renderTraceroute(): string {
  return `
    <div class="space-y-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Traceroute Target</span>
          <span class="label-text-alt">IP address or hostname</span>
        </label>
        <div class="join w-full">
          <input 
            type="text" 
            id="traceroute-input" 
            class="input input-bordered join-item flex-1" 
            placeholder="8.8.8.8 or google.com"
          />
          <button id="traceroute-submit" class="btn btn-primary join-item">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Trace
          </button>
        </div>
      </div>
      
      <div id="traceroute-result" class="hidden">
        <!-- Results will be rendered here -->
      </div>
    </div>
  `;
}

export function renderTracerouteResult(
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

  // Parse and colorize traceroute output
  const lines = data
    .split("\n")
    .map((line) => colorizeTracerouteLine(line))
    .join("\n");

  return `
    <div class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          ${escapeHtml(server)}
        </h3>
        <pre class="code-output">${lines}</pre>
      </div>
    </div>
  `;
}

function colorizeTracerouteLine(line: string): string {
  // Highlight hop numbers
  line = escapeHtml(line);

  // Highlight IP addresses
  line = line.replace(
    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
    '<span class="text-primary font-semibold">$1</span>',
  );

  // Highlight timeouts
  line = line.replace(/(\*)/g, '<span class="text-error">$1</span>');

  // Highlight timing
  line = line.replace(
    /(\d+\.?\d*\s*ms)/g,
    '<span class="text-success">$1</span>',
  );

  return line;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
