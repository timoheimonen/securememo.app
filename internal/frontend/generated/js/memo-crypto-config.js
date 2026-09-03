(function () {
  const currentVersion = 1;
  const defaultUnversionedVersion = 1;
  const versions = Object.freeze({
    1: Object.freeze({
      version: 1,
      prefix: 'v1:',
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      cipher: 'AES-GCM',
      iterations: 3500000,
      keyLength: 256,
      saltLength: 16,
      ivLength: 12
    })
  });
  let workerScriptPolicy = null;

  function validatedWorkerScriptURL(input) {
    const url = new URL(input, globalThis.location.origin);
    const versionValues = url.searchParams.getAll('v');
    const hasOnlyVersion = Array.from(url.searchParams.keys()).every(key => key === 'v');
    if (url.origin !== globalThis.location.origin ||
        url.pathname !== '/js/memo-crypto-worker.js' ||
        url.hash ||
        !hasOnlyVersion ||
        versionValues.length > 1 ||
        (versionValues.length === 1 && !/^[A-Za-z0-9_-]{1,32}$/.test(versionValues[0]))) {
      throw new Error('Invalid crypto worker URL.');
    }
    return url.href;
  }

  function createWorkerScriptURL(input) {
    const safeURL = validatedWorkerScriptURL(input);
    const trustedTypesFactory = globalThis.trustedTypes;
    if (!trustedTypesFactory || typeof trustedTypesFactory.createPolicy !== 'function') {
      return safeURL;
    }
    if (!workerScriptPolicy) {
      workerScriptPolicy = trustedTypesFactory.createPolicy('securememo-crypto-worker', {
        createScriptURL: validatedWorkerScriptURL
      });
    }
    return workerScriptPolicy.createScriptURL(safeURL);
  }

  function getVersion(version) {
    const config = versions[version];
    if (!config) {
      throw new Error('Failed to decrypt memo.');
    }
    return config;
  }

  function getCurrentVersion() {
    return getVersion(currentVersion);
  }

  function parseEncryptedMessage(encryptedData) {
    if (typeof encryptedData !== 'string' || !encryptedData) {
      throw new Error('Failed to decrypt memo.');
    }
    const versionMatch = /^v([1-9][0-9]*):(.+)$/.exec(encryptedData);
    if (versionMatch) {
      return {
        config: getVersion(Number(versionMatch[1])),
        ciphertext: versionMatch[2]
      };
    }
    if (encryptedData.includes(':')) {
      throw new Error('Failed to decrypt memo.');
    }
    return {
      config: getVersion(defaultUnversionedVersion),
      ciphertext: encryptedData
    };
  }

  globalThis.MemoCryptoConfig = Object.freeze({
    currentVersion: currentVersion,
    defaultUnversionedVersion: defaultUnversionedVersion,
    versions: versions,
    getVersion: getVersion,
    getCurrentVersion: getCurrentVersion,
    parseEncryptedMessage: parseEncryptedMessage,
    createWorkerScriptURL: createWorkerScriptURL
  });
})();
