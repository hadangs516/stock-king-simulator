// Keep inactive drafts, but exclude them from browser validation and FormData.
export function syncConditionalFields(root){
 for(const group of root.querySelectorAll('[data-depends-on]')){
  const form=group.closest('form'),selector=form?.elements.namedItem(group.dataset.dependsOn);
  const active=!!selector&&group.dataset.values.split('|').includes(selector.value);
  group.hidden=!active;
  for(const input of group.querySelectorAll('input,select,textarea,button')){
   if(!('conditionalDisabled' in input.dataset))input.dataset.conditionalDisabled=String(input.disabled);
   input.disabled=!active||input.dataset.conditionalDisabled==='true';
  }
 }
}
