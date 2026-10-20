<script lang="ts">
  import AuthTitleBar from '$lib/features/window-chrome/presentation/AuthTitleBar.svelte';

  let { children, heading }: { children: import('svelte').Snippet; heading: string } = $props();
</script>

<AuthTitleBar />

<div class="auth-page">
  <div class="auth-decor" aria-hidden="true">
    <span class="auth-corner-tl"></span>
    <span class="auth-corner-tl-navy"></span>
    <span class="auth-band-br"></span>
    <span class="auth-scene"></span>
  </div>

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
</div>

<style>
  .auth-page {
    /* The corner wedges mirror the diagonal bands baked into campus.png at the
       lower right (dx/dy ≈ 0.54), so both accents share one angle. */
    --auth-wedge-height: clamp(150px, 26vh, 320px);
    --auth-wedge-width: calc(var(--auth-wedge-height) * 0.54);
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

  /* Decorative corner accents from the auth reference sheet. Clipped to their
     own layer so they can never widen the page. */
  .auth-decor {
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  .auth-corner-tl,
  .auth-corner-tl-navy,
  .auth-band-br,
  .auth-scene {
    display: block;
    position: absolute;
  }

  .auth-corner-tl-navy {
    background: var(--brand-navy-900);
    clip-path: polygon(0 0, 72% 0, 0 72%);
    height: var(--auth-wedge-height);
    left: 0;
    top: 0;
    width: var(--auth-wedge-width);
  }

  .auth-corner-tl {
    background: var(--auth-band);
    clip-path: polygon(0 0, 100% 0, 0 100%);
    height: var(--auth-wedge-height);
    left: 0;
    top: 0;
    width: var(--auth-wedge-width);
  }

  .auth-band-br {
    background: var(--auth-band);
    bottom: 0;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
    height: var(--auth-wedge-height);
    right: 0;
    width: var(--auth-wedge-width);
  }

  .auth-scene {
    background: url('/brand/campus.png') right bottom / contain no-repeat;
    bottom: 0;
    /* The photograph is a faint wash behind the page: lightened, then faded as a
       whole so the paper tone shows through it. */
    filter: brightness(1.18) saturate(1.04);
    height: clamp(200px, 42vh, 620px);
    opacity: 0.62;
    right: 0;
    width: clamp(240px, 42vw, 780px);
  }

  /* The stack owns the vertical seat: auto margins split the free space when the
     viewport is tall, and collapse to zero the moment the content fills it. */
  .auth-stack {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: clamp(16px, 3vh, 28px);
    margin-block: auto;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .auth-brand {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: center;
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

  /* Small screens: tighter seat, smaller mark, no photograph behind the text. */
  @media (max-width: 640px) {
    .auth-page {
      --auth-wedge-height: 120px;
    }

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
      --auth-wedge-height: 120px;
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
