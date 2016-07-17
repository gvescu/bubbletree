
/*
 * represents a bubble
 */
BubbleTree.Bubbles.IconDonut = function(node, bubblechart, origin, radius, angle, color) {

    var ns = BubbleTree, utils = ns.Utils, me = this;
    me.className = "bubble";
    me.node = node;
    me.paper = bubblechart.paper;
    me.origin = origin;
    me.bc = bubblechart;
    me.rad = radius;
    me.angle = angle;
    me.color = color;
    me.alpha = 1;
    me.visible = false;
    me.ns = ns;
    me.pos = ns.Vector(0,0);
    me.bubbleRad = utils.amount2rad(this.node.amount);

    me.iconLoaded = false;

    /*
     * child rotation is just used from outside to layout possible child bubbles
     */
    me.childRotation = 0;


    /*
     * convertes polar coordinates to x,y
     */
    me.getXY = function() {
        var me = this, o = me.origin, a = me.angle, r = me.rad;
        if (me.pos === undefined) me.pos = new me.ns.Vector(0,0);
        me.pos.x = o.x + Math.cos(a) * r;
        me.pos.y = o.y - Math.sin(a) * r;
    };

    /*
     * inistalizes the bubble
     */
    me.init = function() {
        var me = this;
        me.pos = new me.ns.Vector(0,0);
        me.getXY();

        me.hasIcon = me.node.hasOwnProperty('icon');

        var breakdown = [], b, i, val, bd = [], styles = me.bc.config.bubbleStyles;

        if (!me.node.shortLabel) me.node.shortLabel = me.node.label.length > 50 ? me.node.label.substr(0, 30)+'...' : me.node.label;

        me.breakdownOpacities = [0.2, 0.7, 0.45, 0.6, 0.35];
        me.breakdownColors = [false, false, false, false, false, false, false, false, false, false];

        for (i in me.node.breakdowns) {
            b = me.node.breakdowns[i];
            b.famount = utils.formatNumber(b.amount);
            val = b.amount / me.node.amount;
            breakdown.push(val);
            bd.push(b);

            if (styles && styles.hasOwnProperty('name') && styles.name.hasOwnProperty(b.name) && styles.name[b.name].hasOwnProperty('opacity')) {
                me.breakdownOpacities[bd.length-1] = styles.name[b.name].opacity;
            }

            if (styles && styles.hasOwnProperty('name') && styles.name.hasOwnProperty(b.name) && styles.name[b.name].hasOwnProperty('color')) {
                me.breakdownColors[bd.length-1] = styles.name[b.name].color;
                me.breakdownOpacities[bd.length-1] = 1;
            }
        }
        me.node.breakdowns = bd;
        me.breakdown = breakdown;

        me.initialized = true;

    };


    /*
     * adds all visible elements to the page
     */
    me.show = function() {
        var me = this, i, cx = me.pos.x, icon, cy = me.pos.y, r = Math.max(5, me.bubbleRad * me.bc.bubbleScale);

        me.circle = me.paper.circle(cx, cy, r)
            .attr({ stroke: false, fill: me.color });

        if ($.isFunction(me.bc.config.initTooltip)) {
            me.bc.config.initTooltip(me.node, me.circle.node);
        }

        // dashed border
        /*
        me.dashedBorder = me.paper.circle(me.pos.x, me.pos.y,  r*0.85)
            .attr({ stroke: '#fff', 'stroke-opacity': me.alpha * 0.4,  'stroke-dasharray': ". ", fill: false });
        */

        me.label = $('<div class="label '+me.node.id+'"><div class="amount">'+utils.formatNumber(me.node.amount)+'</div><div class="desc">'+me.node.shortLabel+'</div></div>');
        me.bc.$container.append(me.label);

        if ($.isFunction(me.bc.config.initTooltip)) {
            me.bc.config.initTooltip(me.node, me.label[0]);
        }

        // additional label
        me.label2 = $('<div class="label2 '+me.node.id+'"><span>'+me.node.shortLabel+'</span></div>');
        me.bc.$container.append(me.label2);

        if (me.node.children.length > 1) {
            $(me.circle.node).css({ cursor: 'pointer'});
            $(me.label).css({ cursor: 'pointer'});
        }

        me.visible = true;

        if (me.hasIcon) {
            if (!me.iconLoaded) me.loadIcon();
            else me.displayIcon();
        } else {
            me.addOverlay();
        }
    };

    /*
     * will load the icon as soon as needed
     */
    me.loadIcon = function() {
        var me = this, ldr = new vis4loader();
        ldr.add(me.bc.config.rootPath + me.node.icon);
        ldr.load(me.iconLoadComplete.bind(me));
    };

    /*
     * on complete handler for icon loading process
     */
    me.iconLoadComplete = function(ldr) {
        var me = this, svg, j, paths;
        svg = ldr.items[0].data;
        me.iconPathData = '';
        //if (typeof(svg) == "string") svg = $(svg)[0];
        svg = $(svg);
        paths = $('path', svg); //svg.getElementsByTagName('path');
        for (j in paths) {
            if (paths[j] && typeof paths[j].getAttribute === "function") {
                me.iconPathData += String(paths[j].getAttribute('d'))+' ';
            }
        }
        me.iconLoaded = true;
        me.displayIcon();
    };

    /*
     * will display the icon, create the svg path element, etc
     */
    me.displayIcon = function() {
        var me = this, i, path;
        me.iconPaths = [];

        path = me.paper.path(me.iconPathData);
        path.attr({fill: "#fff", stroke: "none"}).translate(-50, -50);
        me.iconPaths.push(path);
        //me.mgroup.addMember(path.node);

        me.addOverlay();
    };

    /*
     * adds an invisible bubble on top for seamless
     * event handling
     */
    me.addOverlay = function() {
        // add invisible overlay circle
        var me = this;

        me.overlay = me.paper.circle(me.circle.attrs.cx, me.circle.attrs.cy, me.circle.attrs.r)
            .attr({ stroke: false, fill: '#fff', 'fill-opacity': 0});

        if (Raphael.svg) {
            me.overlay.node.setAttribute('class', me.node.id);
        }
        $(me.overlay.node).css({ cursor: 'pointer'});

        $(me.overlay.node).click(me.onclick.bind(me));
        $(me.label).click(me.onclick.bind(me));
        $(me.label2).click(me.onclick.bind(me));

        if ($.isPlainObject(me.bc.tooltip)) {
            // use q-tip tooltips
            var tt = me.bc.tooltip.content(me.node);
            var tooltip = {
                position: {
                    target: 'mouse',
                    viewport: $(window),
                    adjust: { x:7, y:7 }
                },
                show: {
                    delay: me.bc.tooltip.delay || 100
                },
                content: {
                    title: tt[0],
                    text: tt[1]
                },
                style: {
                    width: 300
                }
            };
            $(me.overlay.node).qtip(tooltip);
            $(me.label).qtip(tooltip);

        }

        if (me.breakdown.length > 1) {
            me.breakdownArcs = {};

            for (i in me.breakdown) {
                var col = me.breakdownColors[i] ? me.breakdownColors[i] : '#fff',
                    arc = me.paper.path("M 0 0 L 2 2")
                        .attr({ fill: col, 'fill-opacity': Math.random()*0.4 + 0.3, stroke: '#fff'});
                me.breakdownArcs[i] = arc;
                // $(arc.node).hover(me.arcHover.bind(me), me.arcUnhover.bind(me));

                if ($.isPlainObject(me.bc.tooltip)) {
                    // use q-tip tooltips for breakdowns
                    var tt = me.bc.tooltip.content(me.node.breakdowns[i]);
                    $(arc.node).qtip({
                        position: {
                            target: 'mouse',
                            viewport: $(window),
                            adjust: { x:7, y:7 }
                        },
                        show: {
                            delay: me.bc.tooltip.delay || 100
                        },
                        content: {
                            title: tt[0],
                            text: tt[1]
                        },
                        style: {
                            width: 300
                        }
                    });
                }
            }

            for (i in me.breakdownArcs) {
                // we dont add the breakdown arcs to the list 'cause
                // we want them to fire different mouse over events
                // list.push(me.breakdownArcs[i].node);
                $(me.breakdownArcs[i].node).click(me.onclick.bind(me));
            }
        }


    };

    /*
     * will remove the icon from stage
     */
    me.removeIcon = function() {
        var me = this, i, path;
        for (i in me.iconPaths) {
            me.iconPaths[i].remove();
        }
        me.iconPaths = [];
    };


    me.draw = function() {
        var me = this,
            r = Math.max(5, me.bubbleRad * me.bc.bubbleScale),
            ox = me.pos.x,
            oy = me.pos.y,
            devnull = me.getXY(),
            x = me.pos.x, y = me.pos.y,
            showIcon = me.hasIcon && r > 15,
            showLabel = me.hasIcon ? r > 40 : r > 20,
            i, path, scale, transform, ly;

        if (!me.visible) return;

        me.circle.attr({ cx: x, cy: y, r: r, 'fill-opacity': me.alpha });
        if(me.overlay)
            me.overlay.attr({ cx: x, cy: y, r: Math.max(10,r)});

        // dashed border
        /*
        if (me.node.children.length > 1) me.dashedBorder.attr({ cx: me.pos.x, cy: me.pos.y, r: r-4, 'stroke-opacity': me.alpha * 0.9 });
        else me.dashedBorder.attr({ 'stroke-opacity': 0 });
        */

        //me.label.attr({ x: me.pos.x, y: me.pos.y, 'font-size': Math.max(4, me.bubbleRad * me.bc.bubbleScale * 0.25) });
        if (!showLabel) {
            me.label.hide();
            var childrenCount = me.node.parent.hasOwnProperty("children") ? me.node.parent.children.length : 0;
            var sortByLabel = me.bc.config.sortBy == 'label';
            if (childrenCount <= 10) {
                me.label2.show()
            } else if (r > 5.5) {
                me.label2.show();
            } else {
                me.label2.hide();
            }

        } else {
            me.label.show();
            if ((showIcon && r < 70) || (!showIcon && r < 40)) {
                me.label.find('.desc').hide();
                me.label2.show();
            } else {
                // full label
                me.label.find('.desc').show();
                me.label2.hide();
            }
        }

        ly = showIcon ? y+r*0.77-me.label.height() : y-me.label.height()*0.5;
        me.label.css({ width: (showIcon ? r*1.2 : 2*r)+'px', opacity: me.alpha });
        me.label.css({ left: (showIcon ? x - r*0.6 : x-r)+'px', top: ly+'px' });

        var w = Math.max(80, 3*r);
        me.label2.css({ width: w+'px', opacity: me.alpha });
        me.label2.css({ left: (x - w*0.5)+'px', top: (y + r)+'px' });


        //if (me.icon) me.icon.translate(me.pos.x - ox, me.pos.y - oy);
        if (me.hasIcon) {
            if (showIcon) {
                scale = (r - (showLabel ? me.label.height()*0.5 : 0)) / 60;
                for (i in me.iconPaths) {
                    path = me.iconPaths[i];
                    //path.translate(me.pos.x - ox, me.pos.y - oy);
                        transform = "scale("+scale+") translate("+(x/scale-50)+", "+((y+(showLabel ? me.label.height()*-0.5 : 0))/scale-50)+")";
                    path.node.setAttribute("transform", transform);
                    path.attr({ 'fill-opacity': me.alpha });

                }
            } else {
                for (i in me.iconPaths) {
                    path = me.iconPaths[i];
                    path.attr({ 'fill-opacity': 0 });
                }
            }
        }

        if (me.breakdown.length > 1) {
            // draw breakdown chart
            var i,x0,x1,x2,x3,y0,y1,y2,y3,ir = r*0.85, oa = -Math.PI * 0.5, da;
            for (i in me.breakdown) {
                da = me.breakdown[i] * Math.PI * 2;
                x0 = x+Math.cos((oa))*ir;
                y0 = y+Math.sin((oa))*ir;
                x1 = x+Math.cos((oa+da))*ir;
                y1 = y+Math.sin((oa+da))*ir;
                x2 = x+Math.cos((oa+da))*r;
                y2 = y+Math.sin((oa+da))*r;
                x3 = x+Math.cos((oa))*r;
                y3 = y+Math.sin((oa))*r;
                oa += da;

                var path = "M"+x0+" "+y0+" A"+ir+","+ir+" 0 "+(da > Math.PI ? "1,1" : "0,1")+" "+x1+","+y1+" L"+x2+" "+y2+" A"+r+","+r+" 0 "+(da > Math.PI ? "1,0" : "0,0")+" "+x3+" "+y3+" Z";

                if (me.hasOwnProperty("breakdownArcs")) {
                    me.breakdownArcs[i].attr({ path: path, 'stroke-opacity': me.alpha*0.2, 'fill-opacity': me.breakdownOpacities[i]*me.alpha });
                }
            }
        }

    };

    /*
     * removes all visible elements from the page
     */
    me.hide = function() {
        var me = this, i;
        me.circle.remove();
        //me.dashedBorder.remove();
        me.label.remove();
        me.label2.remove();

        //me.bc.$container
        me.visible = false;
        if (me.hasIcon) me.removeIcon();
        if (me.overlay) me.overlay.remove();
        for (i in me.breakdownArcs) {
            me.breakdownArcs[i].remove();
        }
    };

    /*
     *
     */
    me.onclick = function(e) {
        var me = this;
        me.bc.onNodeClick(me.node);
        me.bc.navigateTo(me.node);
    };

    me.onhover = function(e) {
        var me = this, c = me.bc.$container[0];
        e.node = me.node;
        e.bubblePos = { x:me.pos.x, y: me.pos.y };
        e.mousePos = { x:e.origEvent.pageX - c.offsetLeft, y: e.origEvent.pageY - c.offsetTop };
        e.type = 'SHOW';
        e.target = me;
        me.bc.tooltip(e);
    };

    me.onunhover = function(e) {
        var me = this, c = me.bc.$container[0];
        e.node = me.node;
        e.type = 'HIDE';
        e.target = me;
        e.bubblePos = { x:me.pos.x, y: me.pos.y };
        e.mousePos = { x:e.origEvent.pageX - c.offsetLeft, y: e.origEvent.pageY - c.offsetTop };
        me.bc.tooltip(e);
    };


    me.init();
};
