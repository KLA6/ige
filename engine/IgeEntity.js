var IgeEntity = IgeObject.extend([
	{extension: IgeTransformExtension, overwrite: false},
	{extension: IgeUiInteractionExtension, overwrite: true}
], {
	classId: 'IgeEntity',

	init: function () {
		this._super();

		this._opacity = 1;
		this._cell = 1;

		this._translate = new IgePoint(0, 0, 0);
		this._rotate = new IgePoint(0, 0, 0);
		this._scale = new IgePoint(1, 1, 1);
		this._origin = new IgePoint(0.5, 0.5, 0.5);

		this.geometry = new IgePoint(20, 20, 20);
	},

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {String=} id
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id: function (id) {
		if (id !== undefined) {
			this._id = id;
			return this;
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = ige.newIdHex();
		}

		return this._id;
	},

	aabb: function () {
		if (this._worldTranslate) {
			var width2 = (this.geometry.x * this._worldScale.x) / 2,
				height2 = (this.geometry.y * this._worldScale.y) / 2,
				r = (this._rotate.z),
				cornerX1 = width2,
				cornerX2 = width2,
				cornerY1 = -height2,
				cornerY2 = height2,

				sinO = Math.sin(r),
				cosO = Math.cos(r),

				rotatedCorner1X = cornerX1 * cosO - cornerY1 * sinO,
				rotatedCorner1Y = cornerX1 * sinO - cornerY1 * cosO,
				rotatedCorner2X = cornerX2 * cosO - cornerY2 * sinO,
				rotatedCorner2Y = cornerX2 * sinO - cornerY2 * cosO,

				extentX = Math.max(Math.abs(rotatedCorner1X), Math.abs(rotatedCorner2X)),
				extentY = Math.max(Math.abs(rotatedCorner1Y), Math.abs(rotatedCorner2Y)),

				// Rotate the worldTranslate point by the parent rotation
				pr = (this._parent && this._parent._rotate) ? -(this._parent._rotate.z) : 0,
				wtPoint = this._rotatePoint(this._translate, pr, {x: 0, y: 0});

			return {
				x: wtPoint.x + (this._parent._translate ? this._parent._translate.x : 0) - extentX + ige.geometry.x2,
				y: wtPoint.y + (this._parent._translate ? this._parent._translate.y : 0) - extentY + ige.geometry.y2,
				width: extentX * 2,
				height: extentY * 2
			};
		}
	},

	/**
	 * Gets / sets the geometry.x in pixels.
	 * @param {Number=} px
	 * @return {*}
	 */
	width: function (px) {
		if (px !== undefined) {
			this._width = px;
			this.geometry.x = px;
			this.geometry.x2 = (px / 2);
			return this;
		}

		return this._width;
	},

	/**
	 * Gets / sets the geometry.y in pixels.
	 * @param {Number=} px
	 * @return {*}
	 */
	height: function (px) {
		if (px !== undefined) {
			this._height = px;
			this.geometry.y = px;
			this.geometry.y2 = (px / 2);
			return this;
		}

		return this._height;
	},

	/**
	 * Gets / sets the life span of the object in milliseconds. The life
	 * span is how long the object will exist for before being automatically
	 * destroyed.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	lifeSpan: function (val) {
		if (val !== undefined) {
			this.deathTime(new Date().getTime() + val);
			return this;
		}

		return this.deathTime() - new Date().getTime();
	},

	/**
	 * Gets / sets the timestamp in milliseconds that denotes the time
	 * that the entity will be destroyed. The object checks it's own death
	 * time during each tick and if the current time is greater than the
	 * death time, the object will be destroyed.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	deathTime: function (val) {
		if (val !== undefined) {
			this._deathTime = val;
			return this;
		}

		return this._deathTime;
	},

	/**
	 * Gets / sets the entity opacity from 0.0 to 1.0.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	opacity: function (val) {
		if (val !== undefined) {
			this._opacity = val;
			return this;
		}

		return this._opacity;
	},

	/**
	 * Gets / sets the texture to use when rendering the entity.
	 * @param {IgeTexture=} texture
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	texture: function (texture) {
		if (texture !== undefined) {
			this._texture = texture;
			return this;
		}

		return this._texture;
	},

	/**
	 * Gets / sets the current texture cell used when rendering the game
	 * object's texture. If the texture is not cell-based, this value is
	 * ignored.
	 * @param {Number=} val
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	cell: function (val) {
		if (val > 0) {
			this._cell = val;
			return this;
		}

		return this._cell;
	},

	mount: function (obj) {
		var ret = this._super(obj);
		this._updateWorldTransform();
		return ret;
	},

	highlight: function (val) {
		if (val !== undefined) {
			this._highlight = val;
			return this;
		}

		return this._highlight;
	},

	/**
	 * Sets the canvas context transform properties to match the the game
	 * object's current transform values.
	 * @param ctx
	 * @private
	 */
	_transformContext: function (ctx) {
		ctx.translate(this._translate.x, this._translate.y);
		ctx.rotate(this._rotate.z);
		ctx.scale(this._scale.x, this._scale.y);
	},

	/**
	 * Processes the actions required each render frame.
	 */
	tick: function (ctx, dontTransform) {
		var texture = this._texture,
			aabb = this.aabb(),
			mouseX = ige._mousePos.x,
			mouseY = ige._mousePos.y;

		// Check if the current mouse position is inside this aabb
		if (aabb && (aabb.x <= mouseX && aabb.y <= mouseY && aabb.x + aabb.width > mouseX && aabb.y + aabb.height > mouseY)) {
			// Point is inside the aabb
			this._handleMouseIn();
		} else {
			this._handleMouseOut();
		}

		// Transform the context by the current transform settings
		if (!dontTransform) {
			this._transformContext(ctx);
		}

		// Process any behaviours assigned to the entity
		this._processBehaviours(ctx);

		// Check if the entity is visible based upon its opacity
		if (this._opacity > 0 && texture) {
			// Draw the entity image
			texture.render(ctx, this, ige.tickDelta);

			if (this._highlight) {
				ctx.globalCompositeOperation = 'lighter';
				texture.render(ctx, this);
			}
		}

		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeEntity; }