<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
html,
body {
  min-height: 100%;
  margin: 0;
  background: #09111b;
}

body {
  color: #e8f1ff;
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
}

* {
  box-sizing: border-box;
}

button,
input,
textarea,
select {
  font: inherit;
}

#app {
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
