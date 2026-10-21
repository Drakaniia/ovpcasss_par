<script lang="ts">
  import { onMount } from 'svelte';
  import AuthTitleBar from '$lib/features/window-chrome/presentation/AuthTitleBar.svelte';

  let {
    children,
    heading,
    showMachine = true,
    showScene = true,
  }: {
    children: import('svelte').Snippet;
    heading: string;
    showMachine?: boolean;
    showScene?: boolean;
  } = $props();

  let frame: HTMLIFrameElement | undefined = $state();
  let frameHeight = $state(520);

  onMount(() => {
    if (!frame) return;
    const resize = new ResizeObserver(([entry]) => {
      frameHeight = 104 + Math.max(0, entry.contentRect.width - 48) * (390 / 640);
    });
    resize.observe(frame);
    return () => resize.disconnect();
  });
</script>

<AuthTitleBar />

<div class="auth-page">
  {#if showScene}
    <div class="auth-scene" aria-hidden="true"></div>
  {/if}

  <div class="auth-layout" class:with-machine={showMachine}>
    <div class="auth-stack">
      <div class="auth-brand">
        <img
          class="auth-logo"
          src="/brand/ovpcasss-logo.png"
          alt="OVPCASSS — Office of the Vice President for Culture, Arts, Sports and Student Services"
          width="2172"
          height="724"
        />
        <p class="auth-wordmark">OVPCASSS Paperless PAR</p>
        <h1 class="auth-heading">{heading}</h1>
      </div>

      <main class="auth-card card">
        {@render children()}
      </main>

      <p class="auth-footer">Authorized use only. Activity is recorded in the audit log.</p>
    </div>

    {#if showMachine}
      <figure class="auth-figure">
        <iframe
          bind:this={frame}
          class="auth-figure-frame"
          src="/brand/par-machine.html"
          title="Figure 1. Isometric drawing of a sorting machine for the Post-Activity Report workflow: an intake tray, a tracking-number stamper, a reviewer's desk, a return chute, an approver's seal press, and a glass archive cylinder beneath a seven-position status dial."
          style={`height:${frameHeight}px`}
        ></iframe>
      </figure>
    {/if}
  </div>
</div>

<style>
  .auth-page {
    align-items: center;
    background: var(--surface-auth);
    color: var(--text-auth);
    display: flex;
    flex-direction: column;
    /* Height is a minimum, never a frame: the page seats its content below a
       breathing top padding and scrolls when the card outgrows the viewport. */
    min-height: 100vh;
    min-height: 100svh;
    padding: clamp(48px, 9vh, 112px) clamp(16px, 4vw, 40px) clamp(20px, 5vh, 56px);
    position: relative;
  }

  /* Desktop auth routes sit below the slim window bar (chrome spec §5.4). */
  :global(html.desktop-shell) .auth-page {
    padding-top: calc(var(--titlebar-height) + 48px);
  }

  /* The stack owns the vertical seat: auto margins split the free space when the
     viewport is tall, and collapse to zero the moment the content fills it. */
  /* The photograph is a faint wash in the lower-right corner: lightened, then
     faded as a whole so the paper tone shows through it. */
  .auth-scene {
    background: url('/brand/campus.png') right bottom / contain no-repeat;
    bottom: 0;
    filter: brightness(1.18) saturate(1.04);
    height: clamp(200px, 42vh, 620px);
    opacity: 0.62;
    pointer-events: none;
    position: absolute;
    right: 0;
    width: clamp(240px, 42vw, 780px);
  }

  .auth-layout {
    align-items: center;
    display: grid;
    grid-template-columns: minmax(0, 440px);
    justify-content: center;
    margin-block: auto;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .auth-layout.with-machine {
    gap: clamp(32px, 5vw, 72px);
    grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
    justify-content: normal;
    padding-inline-start: clamp(0px, 8vw, 160px);
  }

  .auth-stack {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: clamp(16px, 3vh, 28px);
    width: 100%;
  }

  .auth-brand {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: center;
    width: 100%;
  }

  .auth-logo {
    display: block;
    height: auto;
    max-width: 100%;
    width: clamp(240px, 30vw, 470px);
  }

  .auth-wordmark {
    color: var(--text-auth);
    font-size: clamp(22px, 2.2vw, 34px);
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.2;
    margin: clamp(10px, 2vh, 18px) 0 0;
    white-space: nowrap;
  }

  .auth-heading {
    color: var(--text-secondary);
    font-size: clamp(15px, 1.1vw, 17px);
    font-weight: 400;
    line-height: 1.4;
    margin: 0;
    max-width: 40ch;
    text-wrap: balance;
  }

  .auth-card {
    border-radius: var(--radius-card-lg);
    color: var(--text-primary);
    max-width: 440px;
    padding: clamp(22px, 3vw, 32px);
    width: 100%;
  }

  .auth-footer {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    max-width: 440px;
    text-align: center;
  }

  .auth-figure {
    margin: 0;
    width: 100%;
  }

  .auth-figure-frame {
    border: 0;
    display: block;
    width: 100%;
  }

  @media (max-width: 1080px) {
    .auth-layout.with-machine {
      grid-template-columns: minmax(0, 440px);
      justify-content: center;
      padding-inline-start: 0;
    }

    .auth-figure {
      display: none;
    }
  }

  /* Small screens: tighter seat, smaller mark, no photograph behind the text. */
  @media (max-width: 640px) {
    .auth-logo {
      width: min(72vw, 300px);
    }

    .auth-scene {
      display: none;
    }
  }

  /* Short viewports (laptops at 200% zoom, projection): the padding gives way
     before the content does. */
  @media (max-height: 700px) {
    .auth-page {
      padding-block: 24px 16px;
    }

    .auth-logo {
      width: clamp(200px, 24vw, 320px);
    }

    .auth-scene {
      opacity: 0.4;
    }
  }
</style>
