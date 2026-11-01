(() => {
  "use strict";

  // إذا كان الموقع وواجهة API منشورين في خدمتين منفصلتين،
  // ضع هنا رابط خادم Flask الصحيح.
  const API_BASE_URL = "https://math-assistant-api.onrender.com";

  const $ = (id) => document.getElementById(id);

  let mode = "equation";

  let currentSpeechText =
    "مرحبًا بك في مساعد الرياضيات. كيف يمكنني مساعدتك اليوم؟";


  // مسارات المحادثة التفاعلية
  const conversation = {

    start: {
      title: "كيف يمكنني مساعدتك؟",

      message:
        "اختر ما تريد فعله، وسأرشدك إلى الخطوة التالية.",

      choices: [
        ["أريد حل تمرين رياضيات", "solve"],
        ["أريد فهم درس", "learn"],
        ["أريد أدوات الجبر", "algebra"],
        ["لست متأكدًا", "other"]
      ]
    },


    solve: {
      title: "ما نوع التمرين؟",

      message:
        "اختر نوع المسألة التي تعمل عليها.",

      choices: [
        ["معادلة", "equation"],
        ["متراجحة", "inequality"],
        ["تحليل تعبير", "factor"],
        ["نشر تعبير", "expand"],
        ["العودة", "start"]
      ]
    },


    learn: {
      title: "ما الموضوع الذي تريد فهمه؟",

      message:
        "يمكنك اختيار موضوع، ثم فتح الأداة المرتبطة به إن وجدت.",

      choices: [
        ["المعادلات", "equation"],
        ["المتراجحات", "inequality"],
        ["التحليل", "factor"],
        ["النشر", "expand"],
        ["العودة", "start"]
      ]
    },


    algebra: {
      title: "اختر أداة الجبر",

      message:
        "هذه الأدوات متاحة حاليًا داخل الموقع.",

      choices: [
        ["حل معادلة", "equation"],
        ["حل متراجحة", "inequality"],
        ["تحليل", "factor"],
        ["نشر", "expand"],
        ["العودة", "start"]
      ]
    },


    other: {
      title: "لا مشكلة!",

      message:
        "يمكنك البدء بأحد هذه الخيارات، وسننتقل معك خطوة بخطوة.",

      choices: [
        ["أريد حل تمرين", "solve"],
        ["أريد فهم درس", "learn"],
        ["أريد أدوات الجبر", "algebra"],
        ["ابدأ من جديد", "start"]
      ]
    }

  };


  const modeLabels = {
    equation: "حل معادلة",
    inequality: "حل متراجحة",
    factor: "تحليل",
    expand: "نشر"
  };


  // القراءة الصوتية
  function speak(text) {

    currentSpeechText = text;

    if (!("speechSynthesis" in window)) {

      $("voiceStatus").textContent =
        "متصفحك لا يدعم القراءة الصوتية.";

      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "ar";
    utterance.rate = 0.92;
    utterance.pitch = 1;

    utterance.onstart = () => {
      $("voiceStatus").textContent =
        "المساعد يتحدث الآن…";
    };

    utterance.onend = () => {
      $("voiceStatus").textContent =
        "انتهت القراءة الصوتية.";
    };

    utterance.onerror = () => {
      $("voiceStatus").textContent =
        "تعذّر تشغيل الصوت في هذا المتصفح.";
    };

    window.speechSynthesis.speak(utterance);
  }


  // عرض المحادثة
  function renderConversation(key, shouldSpeak = false) {

    const state = conversation[key] || conversation.start;

    $("assistantTitle").textContent = state.title;

    $("assistantMessage").textContent = state.message;

    const grid = $("choiceGrid");

    grid.replaceChildren();


    state.choices.forEach(([label, next]) => {

      const button = document.createElement("button");

      button.type = "button";
      button.className = "choice";
      button.textContent = label;


      button.addEventListener("click", () => {

        if (modeLabels[next]) {

          setMode(next);

          $("mathWorkspace").scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

          $("assistantTitle").textContent =
            "تم اختيار: " + modeLabels[next];

          $("assistantMessage").textContent =
            "أدخل المسألة في مساحة العمل، ثم اضغط زر الحساب.";

          speak(
            "تم اختيار " +
            modeLabels[next] +
            ". أدخل المسألة في مساحة العمل."
          );

        } else {

          renderConversation(next, true);

        }

      });


      grid.appendChild(button);

    });


    if (shouldSpeak) {
      speak(state.message);
    }

  }


  // تغيير أداة الرياضيات
  function setMode(nextMode) {

    mode = nextMode;

    document.querySelectorAll(".tab").forEach((tab) => {

      tab.classList.toggle(
        "active",
        tab.dataset.mode === mode
      );

    });


    $("equationFields").hidden =
      mode !== "equation";

    $("singleField").hidden =
      mode === "equation";


    $("expressionLabel").textContent =
      mode === "inequality"
        ? "المتراجحة"
        : "التعبير الرياضي";


    $("expression").placeholder =
      mode === "inequality"
        ? "مثال: x + 2 > 5"
        : "مثال: x^2 - 9";


    $("expression").value =
      mode === "factor"
        ? "x^2 - 9"
        : mode === "expand"
        ? "(x + 2)^2"
        : mode === "inequality"
        ? "x + 2 > 5"
        : $("expression").value;


    $("solveButton").textContent = ({
      equation: "حل المعادلة ←",
      inequality: "حل المتراجحة ←",
      factor: "حلّل التعبير ←",
      expand: "انشر التعبير ←"
    })[mode];


    hideResult();

  }


  // إخفاء النتائج
  function hideResult() {

    $("result").hidden = true;

    $("errorMessage").hidden = true;

  }


  // عرض النتيجة
  function showResult(data) {

    $("resultTitle").textContent =
      data.title || "النتيجة";


    const answer = Array.isArray(data.answer)
      ? (
          data.answer.length
            ? data.answer.join(" ، ")
            : "لا توجد حلول"
        )
      : String(data.answer);


    $("answer").textContent = answer;


    const list = $("steps");

    list.replaceChildren();


    (data.steps || []).forEach((step) => {

      const item = document.createElement("li");

      item.textContent = step;

      list.appendChild(item);

    });


    $("result").hidden = false;

    $("errorMessage").hidden = true;

  }


  // عرض الأخطاء
  function showError(message) {

    $("errorMessage").textContent = message;

    $("errorMessage").hidden = false;

    $("result").hidden = true;

  }


  // إرسال العملية الرياضية إلى Flask
  async function calculate(event) {

    event.preventDefault();

    hideResult();

    const payload = { mode };


    if (mode === "equation") {

      payload.left = $("leftExpr").value;

      payload.right = $("rightExpr").value;

    } else {

      payload.expression = $("expression").value;

    }


    $("solveButton").disabled = true;

    $("solveButton").textContent = "جارٍ الحساب…";


    try {

      const response = await fetch(
        `${API_BASE_URL}/api/calculate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );


      const data = await response.json();


      if (!response.ok || !data.success) {

        throw new Error(
          data.error || "حدث خطأ أثناء الحساب."
        );

      }


      showResult(data);


    } catch (error) {

      showError(
        error.message ||
        "تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت ورابط API."
      );

    } finally {

      $("solveButton").disabled = false;

      $("solveButton").textContent = ({
        equation: "حل المعادلة ←",
        inequality: "حل المتراجحة ←",
        factor: "حلّل التعبير ←",
        expand: "انشر التعبير ←"
      })[mode];

    }

  }


  // زر الترحيب HI
  $("hiButton").addEventListener("click", () => {

    speak(
      "مرحبًا بك في مساعد الرياضيات. " +
      "يسعدني مساعدتك على فهم الرياضيات خطوة بخطوة. " +
      "اختر ما تحتاج إليه."
    );

    $("assistantPanel").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  });


  // إيقاف الصوت
  $("stopVoiceButton").addEventListener("click", () => {

    if ("speechSynthesis" in window) {

      window.speechSynthesis.cancel();

    }

    $("voiceStatus").textContent =
      "تم إيقاف الصوت.";

  });


  // إعادة قراءة الرسالة
  $("repeatVoice").addEventListener("click", () => {

    speak(currentSpeechText);

  });


  // إعادة المحادثة إلى البداية
  $("restartAssistant").addEventListener("click", () => {

    renderConversation("start", true);

  });


  // أزرار الأدوات
  document.querySelectorAll(".tab").forEach((tab) => {

    tab.addEventListener("click", () => {

      setMode(tab.dataset.mode);

    });

  });


  // الأمثلة الجاهزة
  document.querySelectorAll("[data-example]").forEach((button) => {

    button.addEventListener("click", () => {

      const example = button.dataset.example;


      if (example === "linear") {

        setMode("equation");

        $("leftExpr").value = "5*x - 3";

        $("rightExpr").value = "x + 1/2";

      }

      else if (example === "quadratic") {

        setMode("equation");

        $("leftExpr").value = "x^2 - 5*x + 6";

        $("rightExpr").value = "0";

      }

      else {

        setMode("factor");

        $("expression").value = "x^2 - 9";

      }

    });

  });


  // إرسال النموذج
  $("mathForm").addEventListener("submit", calculate);


  // نسخ النتيجة
  $("copyResult").addEventListener("click", async () => {

    const text =
      `${$("resultTitle").textContent}\n${$("answer").textContent}`;


    try {

      await navigator.clipboard.writeText(text);

      $("copyResult").textContent = "تم النسخ ✓";

      setTimeout(
        () => $("copyResult").textContent = "نسخ النتيجة",
        1600
      );

    } catch {

      $("copyResult").textContent = "تعذّر النسخ";

    }

  });


  // بدء المساعد
  renderConversation("start");

})();