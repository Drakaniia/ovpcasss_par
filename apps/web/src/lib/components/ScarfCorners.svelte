<!-- Decorative mirrored BSU scarf corners, pinned to the nearest positioned parent. -->
<div class="bsu-scarf-corners" aria-hidden="true">
  <img class="bsu-scarf-corners__left" src="/brand/scarf-left.png" alt="" />
  <img class="bsu-scarf-corners__right" src="/brand/scarf-right.png" alt="" />
</div>

<style>
  .bsu-scarf-corners {
    --bsu-scarf-size: clamp(92px, 22vw, 118px);

    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  .bsu-scarf-corners img {
    display: block;
    height: auto;
    position: absolute;
    top: -0.5rem;
    user-select: none;
    width: var(--bsu-scarf-size);
  }

  .bsu-scarf-corners__left {
    left: -0.75rem;
  }

  .bsu-scarf-corners__right {
    right: -0.75rem;
  }
</style>
