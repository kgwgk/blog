// Loader for Miso WASM components
// Finds <div data-miso-component="NAME"> elements and loads the corresponding WASM module.

// Minimal WASI shim for GHC WASM in the browser.
// Only stubs the functions the GHC RTS actually imports.
function createWasiImports(getMemory) {
  const getMem = () => getMemory();

  const decoder = new TextDecoder();

  const ENOSYS = 52;
  const EBADF = 8;

  return {
    args_get: () => 0,
    args_sizes_get: (argc_ptr, argv_buf_size_ptr) => {
      const view = new DataView(getMem().buffer);
      view.setUint32(argc_ptr, 0, true);
      view.setUint32(argv_buf_size_ptr, 0, true);
      return 0;
    },
    environ_get: () => 0,
    environ_sizes_get: (count_ptr, size_ptr) => {
      const view = new DataView(getMem().buffer);
      view.setUint32(count_ptr, 0, true);
      view.setUint32(size_ptr, 0, true);
      return 0;
    },
    clock_time_get: (id, precision, time_ptr) => {
      const view = new DataView(getMem().buffer);
      const now = BigInt(Math.round(performance.now() * 1e6));
      view.setBigUint64(time_ptr, now, true);
      return 0;
    },
    fd_close: () => 0,
    fd_fdstat_get: () => 0,
    fd_fdstat_set_flags: () => 0,
    fd_filestat_get: () => EBADF,
    fd_filestat_set_size: () => EBADF,
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    fd_read: () => EBADF,
    fd_seek: () => ENOSYS,
    fd_write: (fd, iovs_ptr, iovs_len, nwritten_ptr) => {
      const view = new DataView(getMem().buffer);
      const mem = new Uint8Array(getMem().buffer);
      let written = 0;
      for (let i = 0; i < iovs_len; i++) {
        const ptr = view.getUint32(iovs_ptr + i * 8, true);
        const len = view.getUint32(iovs_ptr + i * 8 + 4, true);
        const chunk = decoder.decode(mem.slice(ptr, ptr + len));
        if (fd === 1) console.log(chunk);
        else if (fd === 2) console.error(chunk);
        written += len;
      }
      view.setUint32(nwritten_ptr, written, true);
      return 0;
    },
    path_create_directory: () => ENOSYS,
    path_filestat_get: () => ENOSYS,
    path_open: () => ENOSYS,
    poll_oneoff: () => ENOSYS,
    proc_exit: (code) => {
      throw new Error(`proc_exit(${code})`);
    },
  };
}

async function loadComponent(el) {
  const name = el.dataset.misoComponent;
  try {
    const [{ default: jsffiInit }, wasmBytes] = await Promise.all([
      import(`/wasm/${name}_ghc_wasm_jsffi.js`),
      fetch(`/wasm/${name}.wasm`).then((r) => r.arrayBuffer()),
    ]);

    // The JSFFI init function captures __exports by reference.
    // We pass a mutable object and populate it after instantiation.
    const exports = {};
    const jsffi = jsffiInit(exports);

    // WASI stubs need access to memory, but it's not available until after
    // instantiation. Use a lazy getter that resolves once instance exists.
    let instance;
    const wasiImports = createWasiImports(() => instance.exports.memory);

    instance = (
      await WebAssembly.instantiate(wasmBytes, {
        wasi_snapshot_preview1: wasiImports,
        ghc_wasm_jsffi: jsffi,
      })
    ).instance;
    Object.assign(exports, instance.exports);
    instance.exports._initialize();
    instance.exports.hs_start();
  } catch (err) {
    console.error(`Failed to load Miso component "${name}":`, err);
    el.innerHTML = `<p style="color:red">Failed to load component "${name}".</p>`;
  }
}

const components = document.querySelectorAll("[data-miso-component]");
components.forEach(loadComponent);
