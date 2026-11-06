// Used only when the managed SDK is absent in local development. It never simulates persistence.
function unavailable(): never {
  throw new Error(
    '서버 계정 백업은 배포된 앱에서 사용할 수 있습니다. 이 환경에서는 JSON 백업을 이용해 주세요.',
  );
}

export const auth = {
  getUser: async () => unavailable(),
  signInWithRedirect: async () => unavailable(),
  signOut: async () => unavailable(),
};

export const api = {
  get: async () => unavailable(),
  post: async () => unavailable(),
  put: async () => unavailable(),
  delete: async () => unavailable(),
};
