faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        // Toggle item yang diklik
        parent.classList.toggle('active');
    });
});
