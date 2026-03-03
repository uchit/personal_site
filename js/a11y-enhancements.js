(function ($) {
  'use strict';

  function getActivePageId() {
    if (window.matchMedia('(max-width: 991px)').matches) {
      var $mobile = $('div.page.mobile-active').first();
      return $mobile.length ? $mobile.attr('id') : 'home';
    }
    var $current = $('div#main > div.page.currentpage').first();
    if ($current.length) return $current.attr('id');
    return 'home';
  }

  function updatePageAria(activeId, moveFocus) {
    var $pages = $('div#main > div.page');
    $pages.each(function () {
      var $page = $(this);
      var isActive = $page.attr('id') === activeId;
      $page.attr('aria-hidden', isActive ? 'false' : 'true');
      if (!isActive) {
        $page.attr('tabindex', '-1');
      }
    });

    var $active = $('#' + activeId + '.page');
    if ($active.length) {
      $active.attr('tabindex', '-1');
      if (moveFocus) {
        var $focusTarget = $active.find('h1, h2, h3, a, button, [tabindex]:not([tabindex="-1"])').filter(':visible').first();
        if ($focusTarget.length) {
          $focusTarget.focus();
        } else {
          $active.focus();
        }
      }
    }
  }

  function updateMenuAria(activeId) {
    $('#navigation a').attr({'aria-current': 'false'});
    $('#navigation a[href="#' + activeId + '"]').attr({'aria-current': 'page'});
  }

  function updateMenuExpanded() {
    var expanded = $('#sidebar').hasClass('menu-open') || $('#main-nav').hasClass('menu-open');
    $('a.mobilemenu').attr('aria-expanded', expanded ? 'true' : 'false');
  }

  $(document).ready(function () {
    $('div#main').attr('role', 'main');
    $('ul#navigation').attr({'role': 'list', 'aria-label': 'Primary sections'});

    $('ul.timeline > li').attr({'tabindex': '0', 'role': 'button'});
    $('div.pubmain').attr({'tabindex': '0', 'role': 'button', 'aria-expanded': 'false'});

    $(document).on('keydown', 'ul.timeline > li, div.pubmain, a.mobilemenu', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(this).trigger('click');
      }
    });

    $(document).on('click', 'div.pubmain', function () {
      var expanded = $(this).closest('.item').find('div.pubdetails:visible').length > 0;
      $(this).attr('aria-expanded', expanded ? 'true' : 'false');
    });

    $('#navigation').on('click', 'a', function () {
      var href = $(this).attr('href') || '';
      if (href.charAt(0) !== '#') return;
      var targetId = href.slice(1);
      setTimeout(function () {
        updatePageAria(targetId, true);
        updateMenuAria(targetId);
        updateMenuExpanded();
      }, 450);
    });

    $('a.mobilemenu, #main, #navigation').on('click', function () {
      setTimeout(updateMenuExpanded, 0);
    });


    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') {
        $('#sidebar, #main-nav, .social-icons').removeClass('menu-open');
        updateMenuExpanded();
      }
    });

    var initial = getActivePageId();
    updatePageAria(initial, false);
    updateMenuAria(initial);
    updateMenuExpanded();
  });
})(jQuery);
