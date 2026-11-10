// web-push finto: le notifiche "inviate" si contano; un endpoint con "scaduto" risponde 410.
const g = globalThis as unknown as { __pushAce?: { endpoint: string; corpo: unknown }[] };
export const inviate = (g.__pushAce ??= []);

export default {
  setVapidDetails() {},
  async sendNotification(sub: { endpoint: string }, corpo: string) {
    if (sub.endpoint.includes('scaduto')) throw Object.assign(new Error('scaduta'), { statusCode: 410 });
    inviate.push({ endpoint: sub.endpoint, corpo: JSON.parse(corpo) });
    return { statusCode: 201 };
  },
};
