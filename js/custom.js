var loc = window.location.href,
    index = loc.indexOf('#');

if (index > 0) {
  window.location = loc.substring(0, index);
}

$.fn.exists = function () {
    return this.length > 0 ? this : false;
};

$(document).ready(function(){
    var isMobileView = window.matchMedia("(max-width: 991px)").matches;

    function goHomeFromProfile(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (isMobileView) {
            $("div.page").removeClass("mobile-active");
            $("div#home").addClass("mobile-active");
            $("#sidebar, #main-nav, .social-icons").removeClass("menu-open");
            window.scrollTo(0, 0);
        } else {
            $("#navigation a[href='#home']").closest("li").trigger("click");
        }

        if (window.location.hash !== "#home") {
            window.location.hash = "home";
        }
    }

    /*++++++++++++++++++++++++++++++++++++
        tooltips
    ++++++++++++++++++++++++++++++++++++++*/
    $(".tooltips").tooltip();

            $(document).on('click', '.cta-track', function(e){
        e.preventDefault();

        var $cta = $(this);
        var ctaName = String($cta.data('cta') || 'unknown-cta');
        var ctaText = String($cta.text() || '').toLowerCase();
        var ctaMeta = (ctaName + ' ' + ctaText).toLowerCase();
        var shouldOpenChat = /\b(talk|talks|chat|discuss)\b/.test(ctaMeta);

        if (typeof window.ga === 'function') {
            ga('send', 'event', 'CTA', 'click', ctaName + ':' + (shouldOpenChat ? 'chat' : 'email'));
        }

        if (shouldOpenChat) {
            var chatUrl = 'https://tawk.to/chat/69a66955b326341c3a98b8ac/1jip0mtpt';
            try {
                if (window.Tawk_API && typeof Tawk_API.showWidget === 'function' && typeof Tawk_API.maximize === 'function') {
                    Tawk_API.showWidget();
                    Tawk_API.maximize();
                    return;
                }
            } catch (err) {}

            var chatWindow = window.open(chatUrl, '_blank', 'noopener,noreferrer');
            if (!chatWindow) {
                window.location.assign(chatUrl);
            }
            return;
        }

        var subject = 'Website inquiry: ' + String($cta.text() || 'Consulting inquiry').trim();
        window.location.assign('mailto:contact@hellouchit.com?subject=' + encodeURIComponent(subject));
    });

    /*++++++++++++++++++++++++++++++++++++
        slidepage
    ++++++++++++++++++++++++++++++++++++++*/
    if (isMobileView) {
        // Mobile mode: keep full-width layout but show one section at a time.
        $("#overlay").hide();
        $("#main").css({left:0,right:0});
        $("div.page").css({position:"relative",left:0,width:"100%"}).removeClass("mobile-active");
        $("div#home").addClass("mobile-active");

        $("a.mobilemenu").on("click",function(e){
            e.preventDefault();
            $("#sidebar, #main-nav, .social-icons").toggleClass("menu-open");
        });
        $("#main").on("click",function(){
            $("#sidebar, #main-nav, .social-icons").removeClass("menu-open");
        });
        $(".profile-home-link").on("click touchend", goHomeFromProfile);
        $("#navigation").on("click touchend", "a, li", function(e){
            var $link = $(this).is("a") ? $(this) : $(this).find("a").first();
            if (!$link.length) {
                return;
            }
            var target = $link.attr("href");
            if (!target || target.charAt(0) !== "#") {
                return;
            }
            var $targetPage = $(target + ".page");
            if ($targetPage.length) {
                e.preventDefault();
                e.stopPropagation();
                $("div.page").removeClass("mobile-active");
                $targetPage.addClass("mobile-active");
                $("#sidebar, #main-nav, .social-icons").removeClass("menu-open");
                if (target === "#publications" && $("#cd-dropdown").length) {
                    $("#cd-dropdown").val("all").trigger("change");
                }
                window.scrollTo(0, 0);
            }
        });
    } else {
        // Desktop: keep sidebar/menu fixed and always visible.
        $(".social-icons, #main-nav").stop(true).css({left:0});
        $("#main").stop(true).css({left:250,right:0});
        $(".profile-home-link").on("click", goHomeFromProfile);
    }

    /*++++++++++++++++++++++++++++++++++++
        pages
    ++++++++++++++++++++++++++++++++++++++*/
    var pager = {
        pageContainer : $("div#main"),
        pages : $("div.page"),
        menuItems: $("ul#navigation"),
        overlay : $("div#overlay"),
        topz : 500,
        init: function(){
            var self = this;

            self.menuItems.on('click','li:not(.external)', function(e){
                e.preventDefault();
                var $li = $(this),
                    $target = $($li.children('a').attr('href')),
                    currentPosition = $target.attr('data-pos'),
                    $secondary = self.pageContainer.children(".currentpage");
                switch (currentPosition){
                    case "home" :
                        self.reset();
                        break;
                    case "p1" :
                        self.forward($target,$secondary);
                        break;
                    case "p3" :
                        if ( parseInt($target.attr('data-order'), 10) === self.maxz() ) {
                            self.backward($target,$secondary);
                        } else {
                            self.forward($target,$secondary);
                        }
                        break;
                    default:
                        return false;
                }
            });

            self.overlay.on('click',function(){
                var $secondary = self.pageContainer.children(".currentpage");
                var $target = self.pageContainer.children("[data-order="+self.maxz()+"]");
                self.backward($target,$secondary);
            });

        },

        reset : function (){
            this.overlay.hide();

            var $gotop1 = this.pages.not(".home");
            $gotop1.attr('data-pos','p1').removeAttr('data-order');
            $gotop1.stop(true).animate({left:"100%"}, 400, function(){
                $gotop1.removeClass('currentpage');
            });
            $gotop1.css({zIndex:0});

            this.hanndelMenu();
        },

        forward : function(gotop2 , /* optional */ gotop3){
            var self = this;

            self.hanndelMenu(gotop2);
            self.overlay.show();
            var maxz = self.maxz();
            gotop2.addClass('currentpage');
            gotop2.attr('data-pos','p2').removeAttr('data-order');
            gotop3.attr('data-pos','p3').attr('data-order',maxz+1);

            gotop2.css({left:"100%", zIndex:self.topz});
            gotop3.css({zIndex:maxz+1});

            gotop2.stop(true).animate({left:"15%"}, 400);
            gotop3.stop(true).animate({left:0}, 300, function(){
                gotop3.removeClass('currentpage');
            });
        },

        backward : function (gotop2,gotop1){
            var self = this;

            self.hanndelMenu(gotop2);
            gotop2.exists() || self.overlay.hide();
            gotop2.addClass('currentpage').removeAttr('data-order').attr('data-pos',"p2");
            gotop1.attr('data-pos','p1');

            gotop2.css({zIndex:self.topz-1});
            gotop2.stop(true).animate({left:"15%"}, 400);
            gotop1.stop(true).animate({left:"100%"}, 500, function(){
                gotop1.removeClass('currentpage').css({zIndex:0});
            });

        },

        maxz : function(){
            var levelArray = this.pages.map(function() {
                return $(this).attr('data-order');
            }).get();
            var maxz = levelArray.length && Math.max.apply(Math, levelArray);
            return maxz;
        },

        hanndelMenu : function(){
            var menuIndex = (arguments.length) ? ((arguments[0].length) ? arguments[0].index() : 0) : 0;

            this.menuItems.children().eq(menuIndex)
                .addClass('currentmenu')
                .siblings().removeClass('currentmenu');
        }
    };

    if (!isMobileView) {
        pager.reset();
        pager.init();
    }


    /*++++++++++++++++++++++++++++++++++++
        click event on ul.timeline titles
    ++++++++++++++++++++++++++++++++++++++*/
    $("ul.timeline").on("click","li", function(){
        var $this = $(this);
        $this.find(".text").slideDown();
        $this.addClass("open");
        $this.siblings('li.open').find(".text").slideUp();
        $this.siblings('li').removeClass("open");
    }).on('mouseenter','li',function(){
        var $this = $(this);
        if (!$this.hasClass('open')) {
            $(this).find(".subject").stop(true).animate({'padding-left':20}, 400);
        }
    }).on('mouseleave','li',function(){
        $(this).find(".subject").stop(true).animate({'padding-left':0}, 200);
    });


    /*++++++++++++++++++++++++++++++++++++
        ul-withdetails details show/hide
    ++++++++++++++++++++++++++++++++++++++*/
    $("ul.ul-withdetails li").find(".row").on('click',function(){
        $(this).closest("li").find(".details")
            .stop(true, true)
            .animate({
                height:"toggle",
                opacity:"toggle"
            },300);
    }).on('mouseenter',function(){
        $(this).closest("li").find(".imageoverlay").stop(true).animate({left:0}, 400);
    }).on('mouseleave', function(){
        $(this).closest("li").find(".imageoverlay").stop(true).animate({left:"-102%"}, 200);
    });


    /*++++++++++++++++++++++++++++++++++++
        Publications page - native filter and sort (legacy plugin removed)
    ++++++++++++++++++++++++++++++++++++++*/
    var $pubGrid = $('div#pub-grid');
    var $pubContainer = $pubGrid.find('.pitems');
    var $pubItems = $pubContainer.children('.item');
    var pubFilter = 'all';
    var pubSortOrder = 'desc';

    $pubItems.each(function(index){
        $(this).attr('data-pub-index', index);
    });

    $pubGrid.on('click','div.pubmain',function(){
        var $this = $(this),
            $item = $this.closest('.item');

        $item.find('div.pubdetails').slideToggle(function(){
            $this.children('i').toggleClass('icon-collapse-alt icon-expand-alt');
        },function(){
            $this.children('i').toggleClass('icon-expand-alt icon-collapse-alt');
        });
    });

    function sortPublicationItems(items, order) {
        return items.sort(function(a, b) {
            var yearA = parseInt($(a).attr('data-year'), 10) || 0;
            var yearB = parseInt($(b).attr('data-year'), 10) || 0;
            if (yearA === yearB) {
                var idxA = parseInt($(a).attr('data-pub-index'), 10) || 0;
                var idxB = parseInt($(b).attr('data-pub-index'), 10) || 0;
                return idxA - idxB;
            }
            return order === 'asc' ? yearA - yearB : yearB - yearA;
        });
    }

    function renderPublications() {
        var sortedItems = sortPublicationItems($pubItems.get().slice(), pubSortOrder);
        $.each(sortedItems, function(_, item) {
            $pubContainer.append(item);
        });

        if (pubFilter === 'all') {
            $pubItems.show();
        } else {
            $pubItems.hide();
            $pubItems.filter('.' + pubFilter).show();
        }
    }

    $(document).on('change', '#cd-dropdown', function() {
        pubFilter = String(this.value || 'all').replace(/^\./, '');
        renderPublications();
    });

    $(document).on('click', '#sort .sort', function(e) {
        e.preventDefault();
        var order = String($(this).data('order') || 'desc').toLowerCase();
        pubSortOrder = order === 'asc' ? 'asc' : 'desc';
        $('#sort .sort').removeClass('active');
        $(this).addClass('active');
        renderPublications();
    });

    $('#sort .sort[data-order="desc"]').addClass('active');
    renderPublications();
});
