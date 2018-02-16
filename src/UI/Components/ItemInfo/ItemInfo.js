/**
 * UI/Components/ItemInfo/ItemInfo.js
 *
 * Item Information
 *
 * This file is part of ROBrowser, Ragnarok Online in the Web Browser (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */
define(function(require)
{
	'use strict';


	/**
	 * Dependencies
	 */
	var jQuery             = require('Utils/jquery');
	var DB                 = require('DB/DBManager');
	var ItemType           = require('DB/Items/ItemType');
	var Client             = require('Core/Client');
	var KEYS               = require('Controls/KeyEventHandler');
	var CardIllustration   = require('UI/Components/CardIllustration/CardIllustration');
	var UIManager          = require('UI/UIManager');
	var Mouse              = require('Controls/MouseEventHandler');
	var UIComponent        = require('UI/UIComponent');
	var htmlText           = require('text!./ItemInfo.html');
	var cssText            = require('text!./ItemInfo.css');
	
	var Network       = require('Network/NetworkManager');
	var PACKET        = require('Network/PacketStructure');


	/**
	 * Create Component
	 */
	var ItemInfo = new UIComponent( 'ItemInfo', htmlText, cssText );


	/**
	 * @var {number} ItemInfo unique id
	 */
	ItemInfo.uid = -1;
	

	/**
	 * Once append to the DOM
	 */
	ItemInfo.onKeyDown = function onKeyDown( event )
	{
		if (event.which === KEYS.ESCAPE) {
			ItemInfo.remove();
			event.stopImmediatePropagation();
			return false;
		}

		return true;
	};


	/**
	 * Once append
	 */
	ItemInfo.onAppend = function onAppend()
	{
		// Seems like "EscapeWindow" is execute first, push it before.
		var events = jQuery._data( window, 'events').keydown;
		events.unshift( events.pop() );
		resize(ItemInfo.ui.find('.container').height());
	};


	/**
	 * Once removed from html
	 */
	ItemInfo.onRemove = function onRemove()
	{
		this.uid = -1;
	};


	/**
	 * Initialize UI
	 */
	ItemInfo.init = function init()
	{
		this.ui.css({ top: 200, left:200 });
		this.ui.find('.extend').mousedown(onResize);
		this.ui.find('.close')
			.mousedown(function(event){
				event.stopImmediatePropagation();
				return false;
			})
			.click(this.remove.bind(this));

		// Ask to see card.
		this.ui.find('.view').click(function(){
			CardIllustration.append();
			CardIllustration.setCard(this.item);
		}.bind(this));

		this.draggable(this.ui.find('.title'));
		
		Network.hookPacket( PACKET.ZC.ACK_REQNAME_BYGID,     onUpdateOwnerName);
	};


	/**
	 * Bind component
	 *
	 * @param {object} item
	 */
	ItemInfo.setItem = function setItem( item )
	{
		var it = DB.getItemInfo( item.ITID );
		var ui = this.ui;
		var cardList = ui.find('.cardlist .border');

		this.item = it;
		Client.loadFile( DB.INTERFACE_PATH + 'collection/' + ( item.IsIdentified ? it.identifiedResourceName : it.unidentifiedResourceName ) + '.bmp', function(data){
			ui.find('.collection').css('backgroundImage', 'url('+data+')' );
		});


		var customname = '';
		var hideslots = false;
		switch (item.slot['card1']) {
			case 0x00FF: // FORGE
				if (item.slot['card2'] >= 3840) { 
					customname += 'Very Very Very Strong';
				} else if (item.slot['card2'] >= 2560) { 
					customname += 'Very Very Strong ';
				} else if (item.slot['card2'] >= 1024) { 
					customname += 'Very Strong ';
				}
				switch (Math.abs(item.slot['card2'] % 10)){
					case 1: customname += 'Ice '; break;
					case 2: customname += 'Earth '; break;
					case 3: customname += 'Fire '; break;
					case 4: customname += 'Wind '; break;
				}
			case 0x00FE: // CREATE
			case 0xFF00: // PET
				hideslots = true;
				
				var name = '^FF0000Unknown\'s^000000 ';
				var GID = (item.slot['card4']<<16) + item.slot['card3'];
				
				if (DB.CNameTable[GID]){
					name = '^0000FF'+DB.CNameTable[GID]+'\'s^000000 ';
				} else {
					getNameByGID(GID);
				}
				
				customname = name + customname;
				
				break;
		}
		
		// Damaged status
		var identifiedDisplayName = item.IsDamaged ? '^FF0000'+customname.replace(/\^[a-fA-F0-9]{6}/gi,'')+it.identifiedDisplayName+'^000000' : customname+it.identifiedDisplayName;
		
		ui.find('.title').text( item.IsIdentified ? identifiedDisplayName: it.unidentifiedDisplayName );
		ui.find('.description-inner').text( item.IsIdentified ? it.identifiedDescriptionName : it.unidentifiedDescriptionName );

		// Add view button (for cards)
		if (item.type === ItemType.CARD) {
			ui.find('.view').show();
		}
		else {
			ui.find('.view').hide();
		}

		switch (item.type) {
			// Not an equipement = no card
			default:
				cardList.parent().hide();
				break;

			case ItemType.WEAPON:
			case ItemType.EQUIP:
			case ItemType.PETEGG:
				if (hideslots){
					cardList.parent().hide();
					break;
				}
				var slotCount = it.slotCount || 0;
				var i;

				cardList.parent().show();
				cardList.empty();

				for (i = 0; i < 4; ++i) {
					addCard(cardList, (item.slot && item.slot['card' + (i+1)]) || 0, i, slotCount);
				}
				if (!item.IsIdentified) {
					cardList.parent().hide();
				}
				break;
				
		}
		resize(ItemInfo.ui.find('.container').height());
	};


	/**
	 * Add a card into a slot
	 *
	 * @param {object} jquery cart list DOM
	 * @param {number} item id
	 * @param {number} index
	 * @param {number} max slots
	 */
	function addCard( cardList, itemId, index, maxSlots )
	{
		var file, name = '';
		var card = DB.getItemInfo(itemId);

		if (itemId && card) {
			file = 'item/' + card.identifiedResourceName + '.bmp';
			name = '<div class="name">'+ jQuery.escape(card.identifiedDisplayName) + '</div>';
		}
		else if (index < maxSlots) {
			file = 'empty_card_slot.bmp';
		}
		else {
			file = 'disable_card_slot.bmp';
		}

		cardList.append(
			'<div class="item" data-index="'+ index +'">' +
				'<div class="icon"></div>' +
				name +
			'</div>'
		);

		Client.loadFile( DB.INTERFACE_PATH + file, function(data) {
			var element = cardList.find('.item[data-index="'+ index +'"] .icon');
			element.css('backgroundImage', 'url('+ data +')');

			if (itemId && card) {
				element.on('contextmenu',function(){
					ItemInfo.setItem({
						ITID:         itemId,
						IsIdentified: true,
						type:         6
					});
					return false;
				});
			}
		});
	}
	/**
	* Extend ItemInfo window size
	*/
	function onResize()
	{
		var ui      = ItemInfo.ui;
		var top     = ui.position().top;
		var left    = ui.position().left;
		var lastHeight = 0;
		var _Interval;

		function resizing()
		{
			var h = Math.floor((Mouse.screen.y - top));
			if (h === lastHeight) {
				return;
			}
			resize( h );
			lastHeight = h;
		}

		// Start resizing
		_Interval = setInterval(resizing, 30);

		// Stop resizing on left click
		jQuery(window).on('mouseup.resize', function(event){
			if (event.which === 1) {
				clearInterval(_Interval);
				jQuery(window).off('mouseup.resize');
			}
		});
	}


	/**
	* Extend ItemInfo window size
	*
	* @param {number} height
	*/
	function resize( height )
	{
		var container = ItemInfo.ui.find('.container');
		var description = ItemInfo.ui.find('.description');
		var descriptionInner = ItemInfo.ui.find('.description-inner');
		var containerHeight = height;
		var minHeight = 120;
		var maxHeight = (descriptionInner.height() + 45 > 120) ? descriptionInner.height() + 45 : 120;

		if (containerHeight <= minHeight) {
			containerHeight = minHeight;
		}

		if (containerHeight >= maxHeight) {
			containerHeight = maxHeight;
		}

		container.css({
			height: containerHeight
		});
		description.css({
			height: containerHeight - 45
		});
	}
	
	function getNameByGID (GID){
		var pkt   = new PACKET.CZ.REQNAME_BYGID();
		pkt.GID   = GID;
		Network.sendPacket(pkt);
	}
	
	function onUpdateOwnerName (pkt){
		DB.CNameTable[pkt.GID] = pkt.CName
		var str = ItemInfo.ui.find('.title').text();
		ItemInfo.ui.find('.title').text(str.replace('Unknown\'s', '^0000FF'+pkt.CName+'\'s^000000'));
	}
	
	/**
	 * Create component and export it
	 */
	return UIManager.addComponent(ItemInfo);
});
