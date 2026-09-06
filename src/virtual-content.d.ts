declare module 'virtual:application-content' {
  const snapshot: import('./domain/timeline').TimelineSnapshot;
  export default snapshot;
}
declare module 'virtual:detail-entry-url' {
  const url: string;
  export default url;
}
