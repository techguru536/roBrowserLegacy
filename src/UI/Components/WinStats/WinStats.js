/**
 * UI/Components/WinStats/WinStats.js
 *
 * Chararacter Statistiques Informations
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */
define(function(require)
{
	'use strict';


	/**
	 * Dependencies
	 */
	var UIComponent        = require('UI/UIComponent');
	var UIManager          = require('UI/UIManager');
	var Session            = require('Engine/SessionStorage');

	var UIVersionManager    = require('UI/UIVersionManager');
	var Preferences        = require('Core/Preferences');
	var Renderer           = require('Renderer/Renderer');


	var _preferences;
	if (UIVersionManager.getWinStatsVersion() === 0) {
		_preferences = Preferences.get('WinStats', {
			x:        0,
			y:        233,
			show:     false,
			reduce:   false,
		}, 1.0);
	}

	if (UIVersionManager.getWinStatsVersion() === 0) {
		var htmlText           = require('text!./WinStatsV0.html');
		var cssText            = require('text!./WinStatsV0.css');
	} else {
		var htmlText           = require('text!./WinStats.html');
		var cssText            = require('text!./WinStats.css');
	}

	/**
	 * Create component
	 */
	var WinStats = new UIComponent( 'WinStats', htmlText, cssText );


	/**
	 * Initialize UI
	 */
	WinStats.init = function init()
	{
		this.statuspoint = 0;

		this.ui.find('.up button').mousedown(function(){
			switch (this.className) {
				case 'str': WinStats.onRequestUpdate( 13, 1 ); break;
				case 'agi': WinStats.onRequestUpdate( 14, 1 ); break;
				case 'vit': WinStats.onRequestUpdate( 15, 1 ); break;
				case 'int': WinStats.onRequestUpdate( 16, 1 ); break;
				case 'dex': WinStats.onRequestUpdate( 17, 1 ); break;
				case 'luk': WinStats.onRequestUpdate( 18, 1 ); break;
			}
		});

		if (UIVersionManager.getWinStatsVersion() === 0) {
			this.ui.find('.titlebar .mini').click(function(){ WinStats.ui.find('.panel').toggle(); });
			this.ui.find('.titlebar .close').click(function(){ WinStats.ui.hide(); });
			this.draggable(this.ui.find('.titlebar'));
		}
	};

	if (UIVersionManager.getWinStatsVersion() === 0) {
		WinStats.toggle = function toggle()
		{
			this.ui.toggle();

			if (this.ui.is(':visible')) {
				this.focus();
			}
		};
	}


	/**
	 * Stack to store things if the UI is not in html
	 */
	WinStats.stack = [];


	/**
	 * Execute elements in memory
	 */
	WinStats.onAppend = function onAppend()
	{
		var i, count;

		for (i = 0, count = this.stack.length; i < count; ++i) {
			this.update.apply( this, this.stack[i]);
		}

		this.stack.length = 0;

		if (UIVersionManager.getWinStatsVersion() === 0) {
			this.ui.css({
				top:  Math.min( Math.max( 0, _preferences.y), Renderer.height - this.ui.height()),
				left: Math.min( Math.max( 0, _preferences.x), Renderer.width  - this.ui.width())
			});
			if (!_preferences.show) {
				this.ui.hide();
			}
		}
	};


	/**
	 * Update UI elements
	 *
	 * @param {string} type identifier
	 * @param {number} val1
	 * @param {number} val2 (optional)
	 */
	WinStats.update = function update( type, val )
	{
		var str;

		if (!this.__loaded) {
			this.stack.push(arguments);
			return;
		}

		switch (type) {
			case 'statuspoint':
				this.statuspoint = val;
				this.ui.find('.requirements div').each(function(){
					WinStats.ui.find('.up .'+ this.className)
						.css('opacity', parseInt(this.textContent, 10) <= val ? 1 : 0 );
				});
				this.ui.find('.' + type).text(val);
				break;

			case 'guildname':
			case 'atak':
			case 'matak':
			case 'def':
			case 'mdef':
			case 'hit':
			case 'flee':
			case 'critical':
				this.ui.find('.' + type).text(val);
				break;

			case 'aspd':
				this.ui.find('.' + type).text( Math.floor(200-val/10) );
				break;

			case 'matak2':
				if(!Session.isRenewal){
					this.ui.find('.' + type).text('~ '+val);
					break;
				}
			case 'atak2':
			case 'def2':
			case 'mdef2':
			case 'flee2':
				str = val < 0 ? '- ' + (-val) : '+ ' + val;
				this.ui.find('.' + type).text(str);
				break;

			case 'str':
			case 'agi':
			case 'vit':
			case 'int':
			case 'dex':
			case 'luk':
				this.ui.find('.stats .'+ type).text(val);
				break;

			case 'str2':
			case 'agi2':
			case 'vit2':
			case 'int2':
			case 'dex2':
			case 'luk2':
				str = val < 0 ? '- ' + (-val) : val > 0 ? '+' + val : '';
				this.ui.find('.bonus .'+ type.replace('2','')).text( str );
				break;

			case 'str3':
			case 'agi3':
			case 'vit3':
			case 'int3':
			case 'dex3':
			case 'luk3':
				this.ui.find('.requirements .'+ type.replace('3','')).text(val);
				this.ui.find('.up .'+ type.replace('3','')).css('opacity', val <= this.statuspoint ? 1 : 0 );
				break;
		}
	};


	WinStats.onRemove = function onRemove()
	{
		if (_preferences) {
			_preferences.show   =  this.ui.is(':visible');
			_preferences.reduce =  this.ui.find('.panel').css('display') === 'none';
			_preferences.y      =  parseInt(this.ui.css('top'), 10);
			_preferences.x      =  parseInt(this.ui.css('left'), 10);
			_preferences.save();
		}
	}


	/**
	 * Abstract method to define
	 */
	WinStats.onRequestUpdate = function onRequestUpdate(/*id, amount*/){};


	if (UIVersionManager.getWinStatsVersion() > 0){
		/**
		 * Export it (don't add it to component list)
		 */
		return WinStats;
	} else {
		return UIManager.addComponent(WinStats);
	}
});
