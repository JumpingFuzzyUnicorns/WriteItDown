function ajaxWithAuthCheck(ajaxObj) {
    
    function openSignInDialog(ajaxObj) {
        signInDialog.ajaxToRetry = ajaxObj;
        signInDialog.dialog('open');
    }
    
    if (!$.cookie('sessionId')) {
        // client-side check
        openSignInDialog(ajaxObj);
    } else {
        // server-side check
        ajaxObj.statusCode = {
            401: function() { openSignInDialog(ajaxObj); }
        }
        $.ajax(ajaxObj);
    }
}


function showSignInError(errorText) {
    $('#signin-error-text').text(errorText);
    $('#signin-error-text').show("fast");        
}

function setCookie(k, v, expirationTime) {
    var expirationDate = new Date();
    expirationDate.setTime(expirationTime);
    $.cookie(k, v, { expires: expirationDate });
}

function onSignInSuccess(sessionData) {
    setCookie("userId", sessionData.userId, sessionData.sessionExpiration);
    setCookie("sessionId", sessionData.sessionId, sessionData.sessionExpiration);
    if (signInDialog.ajaxToRetry) {
        signInDialog.dialog('close');
        $.ajax(signInDialog.ajaxToRetry);
    } else {
        location = '/';
    }
}

function signOut() {
    $.ajax({
        url: "/signout",
        data: {
            userId: $.cookie('userId'),
            sessionId: $.cookie('sessionId')
        },
        dataType: "json",
        type: "POST"
        // No callbacks: best effort
    });
    $.removeCookie('userId');
    $.removeCookie('sessionId');
}

function onSignInButton() {
    $('#signin-error-text').hide("fast");
    var username = $('#signin-username').val();
    var password1 = $('#signin-password1').val();
    $.ajax({
        url: "/signin",
        data: {
            userId: username,
            password: password1
        },
        dataType: "json",
        type: "POST",
        success: function(data, textStatus, jqxhr) {
            onSignInSuccess(data);
        },
        error: function(jqxhr, textStatus, errorThrown) {
            showSignInError(jqxhr.responseText);
        }
    });
}

function onSignUpButton() {
    $('#signin-error-text').hide("fast");
    var username = $('#signin-username').val();
    var password1 = $('#signin-password1').val();
    var password2 = $('#signin-password2').val();
    if (username.length === 0) {
        showSignInError("please specify a username");
    } else if (password1.length < 6) {
        showSignInError("password must be at least 6 characters long");
    } else if (password1 != password2) {
        showSignInError("passwords must match");
    } else {
        $.ajax({
            url: "/signup",
            data: {
                userId: username,
                password: password1
            },
            dataType: "json",
            type: "POST",
            success: function(data, textStatus, jqxhr) {
                onSignInSuccess(data);
            },
            error: function(jqxhr, textStatus, errorThrown) {
                showSignInError(jqxhr.responseText);
            }
        });
    }
}

var signInDialog = $('#signin-dialog').dialog({
    title: 'Sign in',
    autoOpen: false,
    modal: true,
    dialogClass: "no-close",
    closeOnEscape: false,
    draggable: false,
    resizable: false,
    buttons: {
        "Sign up": function() {
            $('#signin-error-text').hide("fast");
            $('#signin-password2').show("fast");
            $('#signin-password2-label').show("fast");
            $(this).dialog('option', 'buttons', [{text: 'Sign up', click: onSignUpButton}]);
        },
        "Sign in": onSignInButton
    },
});
