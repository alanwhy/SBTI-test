// ─────────────────────────────────────────────
//  SBTI 2.0  —  share.js
//  html2canvas 截图结果页 + 弹层下载
// ─────────────────────────────────────────────

async function generateShareCard() {
  const shareBtn = document.getElementById("shareBtn");
  const originalText = shareBtn.textContent;
  shareBtn.disabled = true;
  shareBtn.textContent = "生成中…";

  try {
    const el = document.querySelector("#result .result-page");
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    showShareOverlay(canvas);
  } catch (e) {
    alert("截图失败，请手动截屏保存 😅");
  } finally {
    shareBtn.disabled = false;
    shareBtn.textContent = originalText;
  }
}

function showShareOverlay(canvas) {
  const overlay = document.getElementById("shareOverlay");
  const container = document.getElementById("shareCanvasContainer");
  const hint = document.getElementById("shareHint");

  container.innerHTML = "";

  const dataURL = canvas.toDataURL("image/png");
  const img = document.createElement("img");
  img.src = dataURL;
  container.appendChild(img);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    hint.textContent = "长按图片即可保存到相册 📲";
    document.getElementById("downloadBtn").style.display = "none";
  } else {
    hint.textContent = "点击「保存图片」下载，或截图分享 🖼";
    const dlBtn = document.getElementById("downloadBtn");
    dlBtn.style.display = "";
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = `SBTI2-${Date.now()}.png`;
      a.click();
    };
  }

  overlay.classList.add("active");
}

// 关闭弹层
document.getElementById("shareOverlayClose")?.addEventListener("click", () => {
  document.getElementById("shareOverlay").classList.remove("active");
});
document.getElementById("shareOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("active");
});
