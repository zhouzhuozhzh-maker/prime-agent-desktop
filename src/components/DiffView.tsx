export function DiffView() {
  return (
    <div className="diff-view" aria-label="Code diff">
      <div className="diff-header">@@ -42,14 +42,20 @@ describe('invoice finalization', () =&gt; {'{'}</div>
      <div className="diff-columns">
        <div className="diff-column old-code">
          <code><span>42</span> const now = new Date();</code>
          <code><span>43</span> await finalizeInvoice(invoiceId);</code>
          <code><span>44</span> expect(invoice.status).toBe('finalized');</code>
          <code><span>45</span> expect(invoice.total).toBe(expectedTotal);</code>
        </div>
        <div className="diff-column new-code">
          <code><span>42</span> const now = clock.fixed('2024-01-01');</code>
          <code><span>43</span> await finalizeInvoice(invoiceId);</code>
          <code><span>44</span> await waitForInvoiceToBePersisted(invoiceId);</code>
          <code><span>45</span> const invoice = await getInvoice(invoiceId);</code>
          <code><span>46</span> expect(invoice.status).toBe('finalized');</code>
          <code><span>47</span> expect(invoice.total).toBe(expectedTotal);</code>
        </div>
      </div>
    </div>
  );
}
