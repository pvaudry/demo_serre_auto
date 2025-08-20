*** Settings ***
Resource        ressources.robot
Suite Setup     Open Browser To App    ${BASE_URL}
Suite Teardown  Close All Browsers

*** Test Cases ***
Dashboard S'affiche
    Wait For Dashboard
    Page Should Contain    Interface domotique — Serre autonome

Les Cartes Affichent Des Mesures
    Wait Until Page Contains Element    css:#t-val
    ${t}=    Get Text    css:#t-val
    Should Not Be Empty    ${t}

Historique Se Dessine Et Se Recharge
    Wait For Dashboard
    ${w}=    Execute Javascript    return document.getElementById('chart-temp').width;
    Should Be True    ${w} > 0
    Reload History
    Sleep    1s
    ${w2}=   Execute Javascript    return document.getElementById('chart-temp').width;
    Should Be True    ${w2} > 0

Modification Des Consignes
    Set Setpoints    27    58    15400
    # Le message flash apparaît dans la zone d’alertes ; on tolère la version sans emoji
    Wait Until Page Contains    Consignes mises à jour
