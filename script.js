
const $ = id => document.getElementById(id);

let mode = "equation";

const tabs = document.querySelectorAll(".tab");

function setMode(newMode) {
    mode = newMode;

    tabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    $("equationFields").hidden = mode !== "equation";
    $("singleField").hidden = mode === "equation";

    const labels = {
        equation: "Calculer étape par étape →",
        factor: "Factoriser l'expression →",
        expand: "Développer l'expression →",
        simplify: "Simplifier l'expression →"
    };

    $("solveBtn").textContent = labels[mode];

    $("expression").value =
        mode === "factor" ? "x^2 - 9" : "(x + 2)^2";

    $("result").classList.remove("show");
}

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        setMode(tab.dataset.mode);
    });
});


function showResult(title, answer, steps) {
    $("resultTitle").textContent = title;
    $("answer").textContent = answer;

    $("steps").replaceChildren();

    steps.forEach(step => {
        const line = document.createElement("div");
        line.textContent = "• " + step;
        $("steps").appendChild(line);
    });

    $("result").classList.add("show");
}


async function calculate() {
    const button = $("solveBtn");

    let payload = {
        operation: mode
    };

    if (mode === "equation") {
        payload.left = $("leftExpr").value.trim();
        payload.right = $("rightExpr").value.trim();
    } else {
        payload.expression = $("expression").value.trim();
    }

    button.disabled = true;
    button.textContent = "Calcul en cours...";

    try {
        const response = await fetch("/api/calculate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Une erreur est survenue.");
        }

        let answer;

        if (Array.isArray(data.result)) {
            answer = data.result.length
                ? data.result.map((value, index) =>
                    `x${index + 1} = ${value}`
                  ).join(" ; ")
                : "Aucune solution trouvée.";
        } else {
            answer = data.result;
        }

        showResult("Résultat", answer, data.steps);

    } catch (error) {
        showResult(
            "Erreur",
            "Impossible d'effectuer le calcul.",
            [error.message]
        );
    } finally {
        button.disabled = false;

        const labels = {
            equation: "Calculer étape par étape →",
            factor: "Factoriser l'expression →",
            expand: "Développer l'expression →",
            simplify: "Simplifier l'expression →"
        };

        button.textContent = labels[mode];
    }
}


$("solveBtn").addEventListener("click", calculate);


document.querySelectorAll(".example").forEach(button => {
    button.addEventListener("click", () => {
        const example = button.dataset.example;

        if (example === "linear") {
            setMode("equation");
            $("leftExpr").value = "5*x - 3";
            $("rightExpr").value = "x + 1/2";
        }

        if (example === "quadratic") {
            setMode("equation");
            $("leftExpr").value = "x^2 - 5*x + 6";
            $("rightExpr").value = "0";
        }

        if (example === "difference") {
            setMode("factor");
            $("expression").value = "x^2 - 9";
        }

        calculate();
    });
});


["leftExpr", "rightExpr", "expression"].forEach(id => {
    $(id).addEventListener("keydown", event => {
        if (event.key === "Enter") {
            calculate();
        }
    });
});
