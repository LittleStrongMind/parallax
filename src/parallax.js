(function(window, document) {

    let _ = null;

    /**
     * Namespace of helper functions.
     *
     * @namespace
     * @type {Object}
     */
    _ = {

        /**
         * Return DOM element(s) based on a selector.
         *
         * @param   {string} selector   The selector of the element to retrieve.
         * @returns {NodeList}          The retrieved element(s).
         */
        get (selector) {
            const found = document.querySelectorAll(selector);
            return found.length > 1 ? found : found[0];
        },

        /**
         * Create a DOM element and return it.
         *
         * @param  {string} tag           The tag name of the element to create.
         * @param  {string} [className]   The class name of the element to create.
         * @param  {string} [id]          The id of the element to create.
         * @return {Element}              The created element.
         */
        create (tag, className, id) {

            const element     = document.createElement(tag);
            element.className = className;
            element.id        = id || '';

            return element;
        },

        /**
         * Return the computed value of a given CSS property for a given DOM element.
         *
         * @param  {DOMElement} element   The DOM element where to look for the CSS property.
         * @param  {string} prop          The name of the CSS property in CSS style (ex: 'border-radius' instead of 'borderRadius').
         * @param  {boolean} parsed       If true the value returned is converted to a number.
         * @return {string|number}        @todo
         */
        computed (element, prop, parsed) {
            const value = window.getComputedStyle(element, null).getPropertyValue(prop);
            return parsed ? parseInt(value, 10) : value;
        },

        /**
         * Return a random value between two borns while taking into account the difference with previously
         * generated values.
         *
         * @param  {number} min            The min born.
         * @param  {number} max            The max born.
         * @param  {number} [previous]     The previously generated value.
         * @param  {number} [spread=25.0]  The difference needed between the random number and the previous value passed.
         * @return {number}                The random number generated.
         */
        random (min, max, previous, spread) {
            spread = spread ? spread : 25.0;
            let value = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!isNaN(previous) && Math.abs(value - previous) >= spread) {
                value += Math.random() * 20;
            }
            return value;
        },

        /**
         * Return a boolean to tell whether or not a string is a correct hex color value.
         *
         * @param  {string}  color The color to test.
         * @return {boolean}       THe boolean telling whether yes or not the color is a valid HEX color.
         */
        isHex (color) {
            if (!/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color)) {
                console.error(`The hex color '${color}' is not valid.`);
                return false;
            }

            return true;
        },

        /**
         * Pick randomly an item inside an array.
         *
         * @param  {Object|string|number[]} array   The array where to pick the value.
         * @return {Object|string|number}           The picked item.
         */
        pick (array) {
            return array[_.random(0, array.length - 1)];
        },

        /**
         * Apply a list of styles to an element.
         *
         * NOTE : The CSS properties name must be written in camel case.
         *
         * @param  {DOMElement} element      The DOM element to style.
         * @param  {Object}     stylesheet   An object containing a list of keys values association describing CSS rules.
         * @return {DOMElement}              The styled DOM element.
         */
        style (element, stylesheet) {

            for (let prop in stylesheet) {
                element.style[prop] = stylesheet[prop];
            }

            return element;
        },
    };


    class Parallax {

        /**
         * Create a Parallax instance.
         *
         * @method constructor
         * @param  {string}    containerSelector   CSS selector for the parallax container.
         * @param  {string[]}  colors              List of colors to apply randomly to the stars.
         * @param  {Object[]}  layers              List of objects describing each layers of stars.
         * @param  {boolean}   mergeLayers         Boolean to indicate if the default layers and the custom one should be merged.
         */
        constructor (containerSelector, colors, layers, mergeLayers) {

            this.container = _.get(containerSelector);
            this.errors    = { colors: [] };

            if (!this.container) {
                console.error(`No container found with the selector '${containerSelector}'.`);
                return false;
            }

            this.defaultColors = ['#ffffff', '#6420e5', '#79e865', '#e81e6b'];

            if (typeof colors !== 'undefined') {

                /**
                 * If the user only passes a unique color. We add it to an array.
                 * // @todo explain why
                 */
                colors = (Array.isArray(colors)) ? colors : [].concat(colors);


                for (let color in colors) {

                    /**
                     * If one of the color is not written in a valid hexadecimal way,
                     * we add this color to the errors array.
                     */
                    if (!_.isHex(colors[color])) {
                        this.errors.colors.push(colors[color]);
                    }
                }

                /**
                 * If there is errors we output them and we abort the instance creation here.
                 */
                if (this.errors.colors.length) {

                    const errorsArray = this.errors.colors;

                    console.error('The following colors are incorrect :');

                    for (let error in errorsArray) { console.error(`- ${errorsArray[error]}`); }

                    return false;
                }

                this.colors = colors;

            } else { this.colors = this.defaultColors; }

            this.defaultLayers = [
                { size: 3, speed: { x: 0, y: .5 }, colors: this.colors },
                { size: 2, speed: { x: 0, y: .3 }, colors: this.colors },
                { size: 1, speed: { x: 0, y: .2 }, colors: this.colors }
            ];

            this.layers = !layers ? this.defaultLayers : mergeLayers ? this.defaultLayers.concat(layers) : layers;

            // Initialization

            this.stars = [];

            this.canvas  = _.create('canvas');
            this.context = this.canvas.getContext('2d');

            _.style(this.container, { position: 'relative' });

            _.style(this.canvas, {
                position: 'absolute',
                top:      '0',
                left:     '0',
                zIndex:   '-1000'
            });

            this.width  = this.canvas.width  = _.computed(this.container, 'width', true);
            this.height = this.canvas.height = _.computed(this.container, 'height', true);

            // @todo add resize listener

            this.container.appendChild(this.canvas);
        }

        /**
         * Return a boolean to indicate if the x and y coordinates are inside the canvas.
         *
         * @method isInside
         * @param  {number}  x   X coordinate.
         * @param  {number}  y   Y coordinate.
         * @return {Boolean}     Boolean telling whether yes or no the coordinates are inside the canvas.
         */
        isInside (x, y) {

            /**
             * The distance after the end of the canvas borders where
             * to make the stars disappear.
             *
             * @todo Write down a better comment.
             * @type {number}
             */
            const fadeDistance = 10.0;

            return (x > 0 && x < this.width + fadeDistance) && (y > 0 && y < this.height + fadeDistance);
        }

        /**
         * Getter returning the value of the area of the canvas.
         *
         * @type {number}
         */
        get area () { return this.width * this.height; }

        /**
         * Check if the container size has
         * @method resize
         * @return {undefined}
         */
        resize () {

            this.width  = this.canvas.width  = _.computed(this.container, 'width', true);
            this.height = this.canvas.height = _.computed(this.container, 'height', true);

            this.calculate();
        }

        /**
         * Calculate the stars positions for each layout based on the density and the area of the canvas.
         *
         * @method calculate
         * @return {undefined}
         */
        calculate () {

            let stars    = null,
                star     = null,
                density  = null,
                previous = { x: null, y: null };

            for (let o = 0; o < this.layers.length; o++) {

                stars   = [];
                density = this.layers[o].density || 1/5000;

                for (let i = 0; i < density * this.area; i++) {
                    star = {
                        x: _.random(-10, this.width, previous.x),
                        y: _.random(-10, this.height, previous.y),
                        // If the current layer does not have specific colors we take the colors of the parallax instance.
                        color: _.pick(this.layers[o].colors ? this.layers[o].colors : this.colors),
                        speed: { x: 0, y: Math.random() * .05 }
                    };

                    previous.x = star.x;
                    previous.y = star.y;

                    stars.push(star);
                }

                this.layers[o].stars = stars;
            }

            return this.layers;
        }

        /**
         * Update the positions of the stars based on their speed
         * .
         * @method update
         * @returns {undefined}
         */
        update () {

            let star = null;

            for (let o = 0; o < this.layers.length; o++) {

                for (let i = 0; i < this.layers[o].stars.length; i++) {
                    star = this.layers[o].stars[i];

                    if (this.isInside(star.x, star.y)) {
                        star.x += this.layers[o].speed.x + star.speed.x;
                        star.y += this.layers[o].speed.y + star.speed.y;
                    } else {
                        star.x = _.random(0, this.width);
                        star.y = 1;
                    }
                }
            }

        }

        /**
         * [clear description]
         * @method clear
         * @return {undefined}
         */
        clear () { this.context.clearRect(0, 0, this.width, this.height); }

        /**
         * Render the canvas for one frame.
         *
         * @method render
         * @return {undefined}
         */
        render () {

            let star = null, layer = null;

            for (let o = 0; o < this.layers.length; o++) {
                layer = this.layers[o];

                for (let i = 0; i < layer.stars.length; i++) {
                    star = layer.stars[i];

                    this.context.fillStyle = star.color;
                    this.context.fillRect(star.x, star.y, layer.size, layer.size);
                    this.context.fill();
                }
            }
        }

        /**
         * Start the rendering loop.
         *
         * @method start
         * @return {undefined}
         */
        start () {

            this.running = true;

            let that = this;

            if (!this.restarted) {
                this.calculate();
                this.restarted = false;
            }

            function loop () {
                if (that.running) {
                    window.requestAnimationFrame(loop);
                    that.clear();
                    that.update();
                    that.render();
                }
            }

            loop();
        }

        /**
          * Pause the rendering loop.
          *
          * @method pause
          * @return {undefined}
          */
        pause () {
            this.running = false;
            this.restarted = true;
        }

    }


    window.Parallax = Parallax;

})(window, document);
