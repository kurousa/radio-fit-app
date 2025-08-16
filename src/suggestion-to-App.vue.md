App.vueにおける以下の指摘へ対応

- """Service Workerの登録ロジックがApp.vueに直接記述されていますが、設計書(design.md)やnotificationService.tsの実装を見ると、この責務はnotificationService.tsが担うことが意図されているようです。
実際にnotificationService.tsにはregisterServiceWorker関数が定義されていますが、どこからも呼び出されていません。
コードの一貫性と責務の分離を保つため、App.vueのonMountedからはnotificationService.registerServiceWorker()を呼び出す形に修正することをお勧めします。

onMounted(() => {  
  registerServiceWorker()  
}) """