// Enable horizontal scrolling with mouse wheel for the latest pattern container
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('latest-pattern-container');

  if (container) {
    container.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        // Scroll horizontally instead of vertically
        container.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }
});